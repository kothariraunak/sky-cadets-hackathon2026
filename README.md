# Sky Cadets

A family-linked, gamified aviation app for young travelers — turning every flight into a
learning adventure and a lifelong passport of memories. Built as a working prototype of the
"Sky Cadets" concept (Cathay Hackathon 2026, Team Vectoire).

Journey structure: **Mission Prep → Airport Explorer → Flight Academy → Destination Discovery
→ Journey Home**. Cadets build an avatar, complete missions, answer quizzes, keep a flight
journal, and collect passport stamps + badges along the way.

## Stack

- **Backend**: Django 6 + Django REST Framework + SimpleJWT, SQLite
- **Frontend**: React (Vite) + React Router, mobile-first responsive CSS

## Running it locally

### Backend (port 8000)

```bash
cd backend
./venv/bin/python manage.py runserver 8000
```

The venv is already set up with Django, DRF, SimpleJWT, django-cors-headers and Pillow, and
the SQLite DB is already migrated and seeded with missions, badges, quizzes and Explore
articles (`./venv/bin/python manage.py seed_data` to reseed).

Django admin: http://localhost:8000/admin — login `admin` / `admin123`.

### Frontend (port 5173)

```bash
cd frontend
npm install   # already run once
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to Django on port 8000
(see `vite.config.js`), so no CORS setup is needed in dev.

## Accounts (invite-only)

There is no public signup: visitors only see the login screen. Create accounts with

```bash
./venv/bin/python manage.py create_cadets someone@cx.com other@cx.com   # prints email<TAB>password
./venv/bin/python manage.py create_cadets someone@cx.com --reset-password
```

On first login each person builds their cadet (avatar, name, dream job).

## Deploying to Fly.io

`Dockerfile` builds the React app and serves it from Django (gunicorn + WhiteNoise);
`fly.toml` runs one machine in Singapore with SQLite on the `skycadets_data` volume.
`backend/start.sh` migrates and seeds a fresh database on boot.

```bash
fly apps create skycadets
fly volumes create skycadets_data --region sin --size 1
fly secrets set SECRET_KEY=$(python3 -c 'import secrets;print(secrets.token_urlsafe(50))')
fly deploy
fly ssh console -C "python manage.py create_cadets kyle@cx.com"   # on the live server
```

## What's implemented

A dark-teal "game HUD" in the style of the in-flight mockups (`mockup_media/`): winged crest,
cartoon cadets, glowing scan frames, pill buttons, confetti rewards. Content lives in
`backend/cadets/content.py` (airports, aircraft, the demo flight schedule, 24 activities, the
33-mission journey, badges and ranks); game rules are in `backend/cadets/game.py`.

**Flow**

1. **Login** (`/`), then **onboarding** on first login: choose your cadet → name & age (sets the age band:
   Junior 5–8, Explorer 9–12, Senior 13–17) → up to two career tracks (pilot, engineer, cabin crew,
   airport ops, meteorologist, photographer).
2. **Home** (`/map`): avatar, Aviator ID, lifetime stars and miles, rank progress, the current flight
   with **Continue current mission** and a smaller **Leave mission**, **Start a new flight**, the list
   of journeys (resume / check in / view journal) and settings.
3. **Start a new flight** (`/scan`): scan the boarding-pass barcode with the camera (IATA BCBP:
   PDF417/Aztec/QR), type the flight number, or use the demo pass (CX251). Route and aircraft come
   from the flight number (`SCHEDULE` in `content.py` stands in for Cathay's data). Check-in starts
   Mission Prep.
4. **Five chapters** (`/missions/:phase`): Mission Prep → Airport Explorer → Flight Academy →
   Destination Discovery → Journey Home. Career tracks add track missions. **Touchdown!** stamps the
   passport and unlocks the destination chapters; **Homeward Bound** completes the journey.
5. **Arcade** (`/arcade`): 24 activities to play any time (quiz, bingo, checklist, match, predict,
   map, draw, write), **Surprise me**, and the **AI quiz maker**. Questions adapt to the age band and
   the cadet's actual route and aircraft.
6. **Journal** (`/journal`): camera photos (resized on the device, served only to the account
   owner), drawings and stories from creative games, meal ratings, the Destination Story contest
   (needs a parent's OK).
7. **Passport** (`/passport`): Aviator ID, lifetime stars & miles, stamps (added on landing),
   Pokémon GO-style badge cabinet (21 badges in 6 families, bronze → silver → gold, progress to the
   next tier, "almost there"), world route map, aircraft flown.
8. **Settings** (`/settings`): text size, avatar, name, age band, career tracks, and a parent zone
   (grown-up check; contest/sharing permissions; logout).

Ranks (New Recruit → Young Aviation Ambassador) need both stars and badges from several families.

## AI quiz maker

Set `ANTHROPIC_API_KEY` (and optionally `AI_QUIZ_MODEL`, default `claude-sonnet-5-5`) to switch it
on — on Fly: `fly secrets set ANTHROPIC_API_KEY=...`. Only the age band, career tracks, route and
aircraft are sent; never names, emails or photos. Without a key the Arcade falls back to the closest
hand-written quiz.

## Languages

13 languages: English, Mandarin (Simplified Chinese, `zh-Hans`), Cantonese (Traditional Chinese
with Hong Kong wording, `zh-HK`), French, German, Dutch, Italian, Hindi, Japanese, Korean, Thai,
Indonesian and Malay. The picker is on the login screen and in Settings; the choice is saved on
the cadet's account and sent to the API as an `X-Language` header. AI quizzes are written in the
chosen language.

- **UI text** lives in `frontend/src/i18n/locales/<lang>.json`, keyed by id (`t('home.continue')`,
  `{var}` placeholders, `_one` plural variants). `en.json` is the source.
  Check with `cd frontend && npm run check:i18n` (missing keys, wrong placeholders).
- **Game content** (missions, quizzes, badges, ranks, cities, fact cards) stays in English in
  `backend/cadets/content.py`, and is translated on the way out with `tr()` / `L()` from
  `cadets/i18n.py`. After adding or changing English content, run
  `python manage.py i18n_catalog` — it refreshes `cadets/locales/catalog.json` (id → English) and
  reports, per language, how many strings are translated in `cadets/locales/<lang>.json` and any
  placeholder mismatches. Untranslated strings fall back to English.
- Templates are written so inserted values don't need grammatical gender or case
  (e.g. "Typical weather in {city}: {climate}."). Keep that style when adding translations.
- Translations were machine-written; have native speakers review them before a wide launch.

## Notes

- Styling follows the colour palette and layout of the mockups, but the crest, mascots and
  medals are original inline SVG (`frontend/src/components/art/`) rather than Cathay's brand assets.
- This is a prototype: photos are represented as emoji picks (no file upload), and there's
  no parent/child account separation yet — every account is a single cadet.
