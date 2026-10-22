"""Live flight times from Hong Kong International Airport's public flight information feed.

HKIA publishes every passenger departure and arrival for a given day (scheduled time, gate and a status
such as "Boarding", "Dep 22:51", "Est at 23:10" or "At gate 14:43"). We read it for flights leaving or
arriving in Hong Kong and fall back to the timetable in `content.SCHEDULE` when the feed is unavailable.
"""
import json
import re
import urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.cache import cache

from . import content as C

HKT = ZoneInfo('Asia/Hong_Kong')
FEED = 'https://www.hongkongairport.com/flightinfo-rest/rest/flights/past?date={day}&lang=en&cargo=false&arrival={arrival}'
CACHE_SECONDS = 300
TIME_IN_STATUS = re.compile(r'(\d{1,2}):(\d{2})(?:\s*\((\d{2})/(\d{2})/(\d{4})\))?')


def _day_list(day, arrival):
    """All passenger flights HKIA lists for one day (cached for 5 minutes). [] if the feed is down."""
    key = f'hkia:{day.isoformat()}:{int(arrival)}'
    hit = cache.get(key)
    if hit is not None:
        return hit
    try:
        req = urllib.request.Request(FEED.format(day=day.isoformat(), arrival=str(arrival).lower()),
                                     headers={'User-Agent': 'SkyCadets/1.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            days = json.load(resp)
        rows = [row for d in days if d.get('date') == day.isoformat() for row in d.get('list', [])]
    except Exception:  # network, timeout or format change: use the fallback timetable
        rows = []
    cache.set(key, rows, CACHE_SECONDS if rows else 60)
    return rows


def _status_time(status, scheduled):
    """The clock time inside a status like "Est at 23:10" or "Dep 00:09 (23/10/2026)", near `scheduled`."""
    m = TIME_IN_STATUS.search(status or '')
    if not m:
        return None
    hh, mm, dd, mo, yy = m.groups()
    if dd:
        return datetime(int(yy), int(mo), int(dd), int(hh), int(mm), tzinfo=HKT)
    t = scheduled.replace(hour=int(hh), minute=int(mm))
    if t - scheduled > timedelta(hours=12):
        t -= timedelta(days=1)
    elif scheduled - t > timedelta(hours=12):
        t += timedelta(days=1)
    return t


def _find(number, day, arrival):
    want = number.replace(' ', '')
    for row in _day_list(day, arrival):
        if any(f.get('no', '').replace(' ', '') == want for f in row.get('flight', [])):
            hh, mm = map(int, row['time'].split(':'))
            return row, datetime(day.year, day.month, day.day, hh, mm, tzinfo=HKT)
    return None


def schedule(number, day=None, now=None):
    """Departure, estimated landing, gate and live status for a Cathay flight.

    `day` is the Hong Kong date of the flight (from the boarding pass); without it we take the next
    departure that hasn't left yet. Returns None for flights we don't know.
    """
    info = C.lookup_flight(number)
    if not info:
        return None
    number = info['flight_number']
    origin, dest, _ac, block, hkg_time = C.SCHEDULE[number]
    block = timedelta(minutes=block)
    arrival = dest == 'HKG'  # coming home: HKIA lists the arrival
    now = now or datetime.now(HKT)
    today = now.astimezone(HKT).date()
    days = [day] if day else [today - timedelta(days=1), today, today + timedelta(days=1)]

    # Without a date, the flight is the first one that hasn't landed yet (yesterday's overnight flight
    # may still be in the air).
    for d in days:
        found = _find(number, d, arrival)
        if not found:
            continue
        row, scheduled = found
        status = (row.get('status') or '').strip()
        moved = _status_time(status, scheduled)
        if arrival:
            landing = moved or scheduled
            departure = (moved or scheduled) - block
        else:
            departure = moved or scheduled
            landing = departure + block
        if not day and landing <= now and d != days[-1]:
            continue
        return dict(info, departure_at=departure, arrival_at=landing, gate=row.get('gate') or '',
                    terminal=row.get('terminal') or '', live_status=status, source='hkia')

    # Fallback timetable: the next scheduled time in Hong Kong.
    hh, mm = map(int, hkg_time.split(':'))
    for d in days:
        at = datetime(d.year, d.month, d.day, hh, mm, tzinfo=HKT)
        departure = at - block if arrival else at
        if day or departure + block > now or d == days[-1]:
            return dict(info, departure_at=departure, arrival_at=departure + block, gate='', terminal='',
                        live_status='', source='timetable')


def day_from_boarding_pass(julian, now=None):
    """Boarding passes carry the flight date as a day of the year (1–366)."""
    try:
        julian = int(julian)
    except (TypeError, ValueError):
        return None
    if not 1 <= julian <= 366:
        return None
    today = (now or datetime.now(HKT)).astimezone(HKT).date()
    d = date(today.year, 1, 1) + timedelta(days=julian - 1)
    if (today - d).days > 180:  # a January flight scanned in December
        d = date(today.year + 1, 1, 1) + timedelta(days=julian - 1)
    return d
