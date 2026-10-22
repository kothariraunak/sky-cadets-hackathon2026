"""Game rules: stars, ranks, badge tiers, journey stages and lifetime stats."""
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from . import content as C
from .i18n import tr
from .models import ActivityCompletion, Badge, CadetBadge, CadetMissionProgress, Flight, PassportStamp

FLOWN = ('landed', 'completed')

# ---------------------------------------------------------------- journey stage (from the flight's timing)
# Getting ready -> at the airport (2 h before departure) -> on board (30 min before) -> landed (estimated
# landing time passed, or the cadet tapped Touchdown). Each stage features the matching chapter's games.
STAGES = ['getting_ready', 'at_airport', 'on_board', 'landed']
STAGE_PHASE = {'getting_ready': 'mission_prep', 'at_airport': 'airport_explorer', 'on_board': 'flight_academy',
               'landed': 'destination_discovery'}
JOURNAL_STAGE = {'getting_ready': 'pre_flight', 'at_airport': 'pre_flight', 'on_board': 'in_flight', 'landed': 'post_flight'}
AT_AIRPORT_BEFORE = timedelta(hours=2)
ON_BOARD_BEFORE = timedelta(minutes=30)


def flight_stage(flight, now=None):
    if flight.status in FLOWN or flight.status == 'left' and flight.landed_at:
        return 'landed'
    if flight.stage_override in STAGES:
        return flight.stage_override
    now = now or timezone.now()
    departure = flight.departure_at
    if now < departure - AT_AIRPORT_BEFORE:
        return 'getting_ready'
    if now < departure - ON_BOARD_BEFORE:
        return 'at_airport'
    if flight.arrival_at and now >= flight.arrival_at:
        return 'landed'
    return 'on_board'


def journal_context(flight, now=None):
    """Where the cadet is on the journey when they write in the journal."""
    if not flight:
        return '', {}
    now = now or timezone.now()
    stage = flight_stage(flight, now)
    ctx = dict(journey_stage=stage, flight=flight.flight_number, origin=flight.origin_code, dest=flight.destination_code)
    if stage in ('getting_ready', 'at_airport'):
        ctx['minutes_to_departure'] = max(0, round((flight.departure_at - now).total_seconds() / 60))
        if flight.gate:
            ctx['gate'] = flight.gate
    elif stage == 'on_board':
        ctx['minutes_flown'] = max(0, round((now - flight.departure_at).total_seconds() / 60))
        if flight.arrival_at:
            ctx['minutes_to_landing'] = max(0, round((flight.arrival_at - now).total_seconds() / 60))
        ctx['altitude_ft'] = flight.cruising_altitude_ft
    else:
        ctx['city'] = flight.destination_name
    return JOURNAL_STAGE[stage], ctx



def families_unlocked(cadet):
    return set(CadetBadge.objects.filter(cadet=cadet).values_list('badge__family', flat=True)) - {''}


def rank_index(stars, families):
    idx = 0
    for i, r in enumerate(C.RANKS):
        if stars >= r['stars'] and families >= r['families']:
            idx = i
    return idx


def recompute_rank(cadet):
    idx = rank_index(cadet.stars, len(families_unlocked(cadet)))
    cadet.level = idx + 1
    cadet.rank_title = C.RANKS[idx]['title']
    cadet.save()


def rank_info(cadet):
    families = len(families_unlocked(cadet))
    idx = rank_index(cadet.stars, families)
    nxt = C.RANKS[idx + 1] if idx + 1 < len(C.RANKS) else None
    info = dict(index=idx, title=tr(C.RANKS[idx]['title']), families=families, ranks=[tr(r['title']) for r in C.RANKS])
    if nxt:
        info['next'] = dict(title=tr(nxt['title']), stars_needed=max(0, nxt['stars'] - cadet.stars),
                            families_needed=max(0, nxt['families'] - families), stars=nxt['stars'])
        info['floor'] = C.RANKS[idx]['stars']
    return info


def award_stars(cadet, amount):
    cadet.stars += amount
    recompute_rank(cadet)


# ---------------------------------------------------------------- badges

def _metric_values(cadet):
    flights = Flight.objects.filter(cadet=cadet)
    countries = {C.AIRPORTS[s.airport_code]['country'] for s in PassportStamp.objects.filter(cadet=cadet)
                 if s.airport_code in C.AIRPORTS and s.airport_code != 'HKG'}
    activity = {}
    for badge in ActivityCompletion.objects.filter(cadet=cadet).values_list('badge', flat=True):
        activity[badge] = activity.get(badge, 0) + 1
    # Missions that aren't a playable activity (photos, auto) count towards their badge directly.
    for badge in CadetMissionProgress.objects.filter(
        cadet=cadet, completed=True, mission__kind__in=('photo', 'auto'),
    ).values_list('mission__badge', flat=True):
        activity[badge] = activity.get(badge, 0) + 1
    return dict(
        activity=activity,
        flights_landed=flights.filter(status__in=FLOWN).count(),
        journeys_completed=flights.filter(status='completed').count(),
        countries=len(countries),
    )


def _badge_progress_en(cadet):
    values = _metric_values(cadet)
    earned = {cb.badge.code: cb for cb in CadetBadge.objects.filter(cadet=cadet).select_related('badge')}
    out = []
    for code, (name, family, icon, desc, metric, tiers) in C.BADGES.items():
        value = values['activity'].get(code, 0) if metric == 'activity' else values[metric]
        tier = sum(1 for t in tiers if value >= t)
        out.append(dict(
            code=code, name=name, family=family, family_name=C.FAMILIES[family][0], icon=icon, description=desc,
            value=value, tier=tier, tier_name=C.TIER_NAMES[tier], tiers=tiers,
            next_target=tiers[tier] if tier < len(tiers) else None,
            earned_at=earned[code].earned_at if code in earned else None,
        ))
    return out


def badge_progress(cadet):
    """Every badge with the cadet's tier and progress, in the request's language."""
    return [dict(b, name=tr(b['name']), description=tr(b['description']), family_name=tr(b['family_name']),
                 tier_name=tr(b['tier_name'])) for b in _badge_progress_en(cadet)]


def evaluate_badges(cadet):
    """Unlock or upgrade badges the cadet now qualifies for; returns the changes to celebrate."""
    changes = []
    for b in _badge_progress_en(cadet):
        if not b['tier']:
            continue
        badge, _ = Badge.objects.get_or_create(code=b['code'], defaults=dict(
            name=b['name'], description=b['description'], icon=b['icon'], family=b['family']))
        cb = CadetBadge.objects.filter(cadet=cadet, badge=badge).first()
        if cb is None:
            CadetBadge.objects.create(cadet=cadet, badge=badge, tier=b['tier'])
        elif cb.tier < b['tier']:
            cb.tier = b['tier']
            cb.save(update_fields=['tier'])
        else:
            continue
        changes.append(dict(code=b['code'], name=tr(b['name']), icon=b['icon'], description=tr(b['description']),
                            family=tr(b['family_name']), tier=b['tier'], tier_name=tr(b['tier_name'])))
    recompute_rank(cadet)
    return changes


# ---------------------------------------------------------------- lifetime stats

def lifetime_miles(cadet):
    return Flight.objects.filter(cadet=cadet, status__in=FLOWN).aggregate(m=Sum('distance_mi'))['m'] or 0


def travel_stats(cadet):
    flown = list(Flight.objects.filter(cadet=cadet, status__in=FLOWN).order_by('departure_at'))
    aircraft = {}
    for f in flown:
        spec = dict(C.AIRCRAFT.get(f.aircraft_type, {}))
        if 'body' in spec:
            spec['body'] = tr(spec['body'])
        a = aircraft.setdefault(f.aircraft_type, dict(type=f.aircraft_type, count=0, flights=[], **spec))
        a['count'] += 1
        a['flights'].append(f.flight_number)
    airport = lambda code: dict(code=code, city=tr(C.AIRPORTS[code]['city']), **{k: C.AIRPORTS[code][k] for k in ('lat', 'lon', 'flag')}) if code in C.AIRPORTS else None
    # Every scanned flight is on the map: dashed until it has landed, then a solid line.
    mapped = Flight.objects.filter(cadet=cadet).exclude(status='left', landed_at__isnull=True).order_by('departure_at')
    routes = [dict(flight_number=f.flight_number, origin=airport(f.origin_code), destination=airport(f.destination_code),
                   flown=flight_stage(f) == 'landed')
              for f in mapped if f.origin_code in C.AIRPORTS and f.destination_code in C.AIRPORTS]
    stamps = PassportStamp.objects.filter(cadet=cadet)
    countries = {C.AIRPORTS[s.airport_code]['country'] for s in stamps if s.airport_code in C.AIRPORTS and s.airport_code != 'HKG'}
    return dict(
        lifetime_stars=cadet.stars, lifetime_miles=sum(f.distance_mi for f in flown), flights_flown=len(flown),
        countries=len(countries), aircraft=sorted(aircraft.values(), key=lambda a: -a['count']), routes=routes,
        home=airport(cadet.home_airport),
    )
