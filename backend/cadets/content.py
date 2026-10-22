"""Sky Cadets game content: airports, aircraft, the demo flight schedule, badges, ranks,
the 24 arcade activities and the five-chapter journey.

Content lives in code (not the database) so it is versioned and reviewed with the app.
The database only stores what each cadet did. Age bands: 'junior' (5-8), 'explorer' (9-12),
'senior' (13-17). A question without `bands` suits every age.
"""
import math
import random
from datetime import datetime
from zoneinfo import ZoneInfo

# ---------------------------------------------------------------- places & aircraft

AIRPORTS = {
    'HKG': dict(city='Hong Kong', country='Hong Kong SAR, China', lat=22.308, lon=113.918, tz='Asia/Hong_Kong', flag='🇭🇰'),
    'LHR': dict(
        city='London', country='United Kingdom', lat=51.470, lon=-0.454, tz='Europe/London', flag='🇬🇧',
        languages=['English'], greeting=('Hello!', 'English'), direction='west',
        words=[('Queue', 'a line of people waiting'), ('Lift', 'an elevator'), ('Biscuit', 'a cookie')],
        landmark=('Tower Bridge', '🌉'), food='Fish and chips', animal='Red fox', climate='mild and often cloudy',
        mountains='Tian Shan', water='the Caspian Sea and the Black Sea', mostly='land',
        transport='the London Underground (the Tube)',
        history=[
            ('Which river flows through London?', ['The Thames', 'The Seine', 'The Danube'], 0,
             'The River Thames winds through the middle of London.'),
            ('About how old is the Tower of London?', ['About 100 years', 'Nearly 1,000 years', 'About 50 years'], 1,
             'Building began in the 1070s, so it is almost a thousand years old.'),
            ('What is "Big Ben"?', ['A clock tower', 'A giant bell', 'A bridge'], 1,
             'Big Ben is the great bell inside the Elizabeth Tower.'),
        ],
    ),
    'CDG': dict(
        city='Paris', country='France', lat=49.010, lon=2.548, tz='Europe/Paris', flag='🇫🇷',
        languages=['French'], greeting=('Bonjour!', 'French'), direction='west',
        words=[('Bonjour', 'hello'), ('Merci', 'thank you'), ('Au revoir', 'goodbye')],
        landmark=('Eiffel Tower', '🗼'), food='Croissant', animal='Hedgehog', climate='mild, with some rain',
        mountains='Tian Shan', water='the Caspian Sea and the Black Sea', mostly='land',
        transport='the Paris Métro and Vélib bikes',
        history=[
            ('Which river flows through Paris?', ['The Thames', 'The Seine', 'The Rhine'], 1,
             'The Seine runs right through the centre of Paris.'),
            ('Why was the Eiffel Tower built?', ['For a world fair in 1889', 'As a lighthouse', 'As a castle'], 0,
             'It was built for the 1889 World’s Fair and was meant to be temporary!'),
            ('What is the Louvre?', ['A famous museum', 'A train station', 'A mountain'], 0,
             'The Louvre is the world’s most visited art museum, home of the Mona Lisa.'),
        ],
    ),
    'JFK': dict(
        city='New York', country='United States', lat=40.641, lon=-73.778, tz='America/New_York', flag='🇺🇸',
        languages=['English'], greeting=('Hi there!', 'English'), direction='east, across the Pacific',
        words=[('Subway', 'the underground train'), ('Sidewalk', 'the pavement'), ('Elevator', 'a lift')],
        landmark=('Statue of Liberty', '🗽'), food='New York bagel', animal='Grey squirrel', climate='changeable, cold in winter',
        mountains='Alaska Range', water='the Pacific Ocean', mostly='water',
        transport='the subway and Citi Bike',
        history=[
            ('Which country gave the Statue of Liberty to the USA?', ['France', 'Japan', 'Canada'], 0,
             'France gave the statue as a gift of friendship in 1886.'),
            ('What is Central Park?', ['A huge park in Manhattan', 'An airport', 'A beach'], 0,
             'Central Park is bigger than the whole country of Monaco!'),
            ('New York City was once called…', ['New Amsterdam', 'New London', 'New Paris'], 0,
             'Dutch settlers named it New Amsterdam before it became New York in 1664.'),
        ],
    ),
    'NRT': dict(
        city='Tokyo', country='Japan', lat=35.772, lon=140.393, tz='Asia/Tokyo', flag='🇯🇵',
        languages=['Japanese'], greeting=('Konnichiwa!', 'Japanese'), direction='north-east',
        words=[('Konnichiwa', 'hello'), ('Arigatō', 'thank you'), ('Sayōnara', 'goodbye')],
        landmark=('Mount Fuji', '🗻'), food='Sushi', animal='Japanese macaque (snow monkey)', climate='warm summers, cool winters',
        mountains='the Japanese Alps', water='the East China Sea and the Pacific Ocean', mostly='water',
        transport='the Shinkansen bullet train',
        history=[
            ('What is the tallest mountain in Japan?', ['Mount Fuji', 'Mount Everest', 'Mount Kilimanjaro'], 0,
             'Mount Fuji is 3,776 m tall and is a sleeping volcano.'),
            ('What is a Shinkansen?', ['A bullet train', 'A temple', 'A dish'], 0,
             'Japan’s bullet trains first ran in 1964 and are famous for being on time.'),
            ('Tokyo used to be called…', ['Edo', 'Kyoto', 'Osaka'], 0,
             'The city was called Edo until 1868.'),
        ],
    ),
    'SYD': dict(
        city='Sydney', country='Australia', lat=-33.940, lon=151.175, tz='Australia/Sydney', flag='🇦🇺',
        languages=['English'], greeting=('G’day!', 'English'), direction='south',
        words=[('G’day', 'hello'), ('Arvo', 'afternoon'), ('Brekkie', 'breakfast')],
        landmark=('Sydney Opera House', '🎭'), food='Meat pie', animal='Kangaroo', climate='warm and sunny',
        mountains='the Great Dividing Range', water='the Philippine Sea and the Coral Sea', mostly='water',
        transport='Sydney ferries and light rail',
        history=[
            ('What covers the roof of the Sydney Opera House?', ['Over a million tiles', 'Gold paint', 'Grass'], 0,
             'More than one million white and cream tiles cover its “sails”.'),
            ('Which animal can’t walk backwards?', ['Kangaroo', 'Dog', 'Cat'], 0,
             'Kangaroos hop forwards, using their strong tail for balance.'),
            ('What is the Harbour Bridge nicknamed?', ['The Coathanger', 'The Ladder', 'The Smile'], 0,
             'Locals call it “the Coathanger” because of its arch shape.'),
        ],
    ),
    'SIN': dict(
        city='Singapore', country='Singapore', lat=1.364, lon=103.991, tz='Asia/Singapore', flag='🇸🇬',
        languages=['English', 'Malay', 'Mandarin', 'Tamil'], greeting=('Selamat pagi!', 'Malay'), direction='south-west',
        words=[('Selamat pagi', 'good morning (Malay)'), ('Xièxie', 'thank you (Mandarin)'), ('Vanakkam', 'hello (Tamil)')],
        landmark=('Merlion', '🦁'), food='Chicken rice', animal='Otter', climate='hot and humid all year',
        mountains='Mount Kinabalu in Borneo', water='the South China Sea', mostly='water',
        transport='the MRT trains',
        history=[
            ('What is the Merlion?', ['Half lion, half fish', 'Half bird, half cat', 'A dragon'], 0,
             'The Merlion is Singapore’s symbol: a lion’s head on a fish’s body.'),
            ('How many official languages does Singapore have?', ['One', 'Four', 'Ten'], 1,
             'English, Malay, Mandarin and Tamil.'),
            ('Singapore is famous for being a…', ['City in a garden', 'Desert city', 'Snowy city'], 0,
             'Singapore calls itself a “City in Nature”, with parks everywhere.'),
        ],
    ),
    'BKK': dict(
        city='Bangkok', country='Thailand', lat=13.690, lon=100.750, tz='Asia/Bangkok', flag='🇹🇭',
        languages=['Thai'], greeting=('Sawasdee!', 'Thai'), direction='west',
        words=[('Sawasdee', 'hello'), ('Khob khun', 'thank you'), ('Aroi', 'delicious')],
        landmark=('Wat Arun temple', '🛕'), food='Pad thai', animal='Asian elephant', climate='hot, with a rainy season',
        mountains='the Annamite Range', water='the South China Sea', mostly='land',
        transport='the BTS Skytrain',
        history=[
            ('What is Thailand’s national animal?', ['Elephant', 'Tiger', 'Panda'], 0,
             'The Thai elephant is a national symbol.'),
            ('Which river runs through Bangkok?', ['Chao Phraya', 'Mekong', 'Nile'], 0,
             'Boats on the Chao Phraya River carry people around the city.'),
            ('What is a “tuk-tuk”?', ['A three-wheeled taxi', 'A sweet', 'A dance'], 0,
             'Tuk-tuks are named after the sound of their engines.'),
        ],
    ),
    'YVR': dict(
        city='Vancouver', country='Canada', lat=49.194, lon=-123.184, tz='America/Vancouver', flag='🇨🇦',
        languages=['English', 'French'], greeting=('Hello / Bonjour!', 'English & French'), direction='east, across the Pacific',
        words=[('Toque', 'a woolly hat'), ('Bonjour', 'hello (French)'), ('Eh?', 'right?')],
        landmark=('Stanley Park', '🌲'), food='Poutine', animal='Orca', climate='mild and rainy',
        mountains='the Coast Mountains', water='the Pacific Ocean', mostly='water',
        transport='the SkyTrain and SeaBus',
        history=[
            ('What are Canada’s two official languages?', ['English and French', 'English and Spanish', 'French and German'], 0,
             'Canada is officially bilingual.'),
            ('Which leaf is on Canada’s flag?', ['Maple', 'Oak', 'Palm'], 0,
             'The red maple leaf has been on the flag since 1965.'),
            ('Which sea animal is famous near Vancouver?', ['Orca', 'Penguin', 'Shark'], 0,
             'Orcas (killer whales) swim in the waters around Vancouver.'),
        ],
    ),
}

AIRCRAFT = {
    'A350-1000': dict(maker='Airbus', body='wide-body', engines=2, seats=334, length=73.8, span=64.8),
    'A350-900': dict(maker='Airbus', body='wide-body', engines=2, seats=280, length=66.8, span=64.8),
    'B777-300ER': dict(maker='Boeing', body='wide-body', engines=2, seats=368, length=73.9, span=64.8),
    'A330-300': dict(maker='Airbus', body='wide-body', engines=2, seats=262, length=63.7, span=60.3),
    'A321neo': dict(maker='Airbus', body='narrow-body', engines=2, seats=202, length=44.5, span=35.8),
}

# Demo stand-in for Cathay's schedule data: flight number -> (from, to, aircraft, block time in minutes,
# scheduled Hong Kong time). The Hong Kong time is the departure when leaving HKG and the arrival when
# coming home; it is only a fallback — the live time, gate and status come from HKIA (`cadets/hkia.py`).
# Block times are the estimate table used to work out when the plane lands.
SCHEDULE = {
    'CX251': ('HKG', 'LHR', 'A350-1000', 845, '22:45'), 'CX250': ('LHR', 'HKG', 'A350-1000', 740, '14:10'),
    'CX255': ('HKG', 'LHR', 'B777-300ER', 845, '23:15'), 'CX254': ('LHR', 'HKG', 'B777-300ER', 740, '18:00'),
    'CX261': ('HKG', 'CDG', 'A350-900', 815, '00:05'), 'CX260': ('CDG', 'HKG', 'A350-900', 715, '06:15'),
    'CX840': ('HKG', 'JFK', 'A350-1000', 950, '16:30'), 'CX841': ('JFK', 'HKG', 'A350-1000', 965, '13:55'),
    'CX500': ('HKG', 'NRT', 'A350-900', 255, '15:20'), 'CX501': ('NRT', 'HKG', 'A350-900', 305, '01:55'),
    'CX101': ('HKG', 'SYD', 'A350-900', 545, '20:30'), 'CX100': ('SYD', 'HKG', 'A350-900', 565, '21:30'),
    'CX715': ('HKG', 'SIN', 'A330-300', 235, '20:55'), 'CX714': ('SIN', 'HKG', 'A330-300', 235, '05:50'),
    'CX703': ('HKG', 'BKK', 'A321neo', 175, '09:20'), 'CX702': ('BKK', 'HKG', 'A321neo', 165, '15:35'),
    'CX888': ('HKG', 'YVR', 'B777-300ER', 705, '00:45'), 'CX889': ('YVR', 'HKG', 'B777-300ER', 850, '06:10'),
}
DEMO_FLIGHT = 'CX251'


def distance_miles(a, b):
    """Great-circle distance between two airports, in miles."""
    p1, p2 = math.radians(a['lat']), math.radians(b['lat'])
    dl = math.radians(b['lon'] - a['lon'])
    c = math.acos(min(1, math.sin(p1) * math.sin(p2) + math.cos(p1) * math.cos(p2) * math.cos(dl)))
    return round(3958.8 * c)


def lookup_flight(number):
    number = number.upper().replace(' ', '')
    if number.startswith('CX') and number[2:].isdigit():
        number = 'CX' + str(int(number[2:]))  # "CX0251" -> "CX251" (boarding passes pad with zeros)
    if number not in SCHEDULE:
        return None
    o, d, ac, block, _hkg_time = SCHEDULE[number]
    return dict(
        flight_number=number, origin_code=o, origin_name=AIRPORTS[o]['city'],
        destination_code=d, destination_name=AIRPORTS[d]['city'], aircraft_type=ac,
        distance_mi=distance_miles(AIRPORTS[o], AIRPORTS[d]), duration_h=round(block / 60, 1),
    )


# ---------------------------------------------------------------- badges & ranks

FAMILIES = {
    'aviation': ('Aviation', '✈️'), 'geography': ('Geography', '🧭'), 'culture': ('Culture', '🏛️'),
    'sustainability': ('Sustainability', '🌱'), 'creativity': ('Creativity', '🎨'), 'journey': ('Journey', '🛂'),
}
TIER_NAMES = ['Locked', 'Bronze', 'Silver', 'Gold']
ACTIVITY_TIERS = [1, 3, 6]  # completions needed for bronze / silver / gold — the next one is always close

# code: (name, family, icon, description, metric, tiers)
# metric 'activity' counts completed missions/activities tagged with this badge.
BADGES = {
    'ready_for_takeoff': ('Ready for Take-off', 'aviation', '🛫', 'Prepared for the flight before boarding.', 'activity', ACTIVITY_TIERS),
    'safety_star': ('Safety Star', 'aviation', '🦺', 'Knows the safety card like a crew member.', 'activity', ACTIVITY_TIERS),
    'junior_pilot': ('Junior Pilot', 'aviation', '🧑‍✈️', 'Understands how and why planes fly.', 'activity', ACTIVITY_TIERS),
    'junior_engineer': ('Junior Flight Engineer', 'aviation', '🔧', 'Knows the parts that make a plane work.', 'activity', ACTIVITY_TIERS),
    'airport_explorer': ('Airport Explorer', 'aviation', '🗼', 'Spotted the airport at work.', 'activity', ACTIVITY_TIERS),
    'ground_ops_rookie': ('Ground Operations Rookie', 'aviation', '🚜', 'Knows the vehicles that get a plane ready.', 'activity', ACTIVITY_TIERS),
    'cloud_navigator': ('Cloud Navigator', 'aviation', '☁️', 'A sharp-eyed window detective.', 'activity', ACTIVITY_TIERS),
    'weather_watcher': ('Weather Watcher', 'geography', '🌦️', 'Reads the sky and predicts the weather.', 'activity', ACTIVITY_TIERS),
    'route_master': ('Route Master', 'geography', '🗺️', 'Knows where the flight goes and why.', 'activity', ACTIVITY_TIERS),
    'mountain_master': ('Mountain Master', 'geography', '⛰️', 'Knows the mountains below the wings.', 'activity', ACTIVITY_TIERS),
    'ocean_explorer': ('Ocean Explorer', 'geography', '🐋', 'Knows the seas and oceans we fly over.', 'activity', ACTIVITY_TIERS),
    'language_explorer': ('Language Explorer', 'culture', '🗣️', 'Learned words in a new language.', 'activity', ACTIVITY_TIERS),
    'culture_collector': ('Culture Collector', 'culture', '🏛️', 'Discovered landmarks, food and history.', 'activity', ACTIVITY_TIERS),
    'planet_protector': ('Planet Protector', 'sustainability', '🌱', 'Chooses greener ways to travel.', 'activity', ACTIVITY_TIERS),
    'responsible_traveller': ('Responsible Traveller', 'sustainability', '✅', 'On time, organised and helpful.', 'activity', ACTIVITY_TIERS),
    'aircraft_designer': ('Aircraft Designer', 'creativity', '🎨', 'Designed tails and dream aircraft.', 'activity', ACTIVITY_TIERS),
    'young_storyteller': ('Young Storyteller', 'creativity', '📖', 'Told the story of the journey.', 'activity', ACTIVITY_TIERS),
    'junior_photographer': ('Junior Photographer', 'creativity', '📸', 'Captured the trip in photos.', 'activity', ACTIVITY_TIERS),
    'first_flight': ('First Flight', 'journey', '🏅', 'Flights landed as a Sky Cadet.', 'flights_landed', [1, 5, 15]),
    'first_international': ('First International Mission', 'journey', '🌍', 'Countries visited.', 'countries', [1, 3, 8]),
    'homeward_bound': ('Homeward Bound', 'journey', '🏡', 'Journeys completed from start to finish.', 'journeys_completed', [1, 3, 10]),
}

# Ranks reward a mix of activities, not flights bought: each needs stars AND badges
# from several different families.
RANKS = [
    dict(title='New Recruit', stars=0, families=0),
    dict(title='Junior Cadet', stars=40, families=1),
    dict(title='Cadet Explorer', stars=120, families=2),
    dict(title='Flight Specialist', stars=260, families=3),
    dict(title='Senior Cadet', stars=450, families=4),
    dict(title='Young Aviation Ambassador', stars=700, families=6),
]

INTERESTS = ['pilot', 'engineer', 'cabin_crew', 'airport_ops', 'meteorologist', 'photographer']
AGE_BANDS = ['junior', 'explorer', 'senior']


def band_for_age(age):
    return 'junior' if age <= 8 else 'explorer' if age <= 12 else 'senior'


# ---------------------------------------------------------------- activities (the Arcade)

def Q(q, choices, answer, explain='', bands=None):
    return dict(q=q, choices=choices, answer=answer, explain=explain, bands=bands)


J, E, S = ['junior'], ['explorer', 'senior'], ['senior']

ACTIVITIES = [
    dict(slug='know-your-aircraft', title='Know Your Aircraft', icon='✈️', kind='quiz', category='Aviation',
         badge='junior_engineer', stars=15, generator='aircraft',
         blurb='Wide-body or narrow-body? How many engines? Meet today’s plane.'),
    dict(slug='know-your-itinerary', title='Know Your Itinerary', icon='🧭', kind='quiz', category='Geography',
         badge='route_master', stars=15, generator='itinerary',
         blurb='Which way are we flying, and what will we cross?'),
    dict(slug='safety-star', title='Safety Star', icon='🦺', kind='quiz', category='Aviation', badge='safety_star', stars=10,
         blurb='Read the safety card like a member of the crew.', questions=[
             Q('When should your seatbelt be fastened?', ['Only at take-off', 'Whenever the seatbelt sign is on', 'Never'], 1,
               'Keep it fastened when the sign is on, and loosely fastened when seated.'),
             Q('Where can you find the safety card?', ['In the seat pocket', 'In the toilet', 'In the overhead locker'], 0,
               'Every seat pocket has one. It shows the exits and how to use your seatbelt.'),
             Q('What should you do when the crew give a safety briefing?', ['Keep playing', 'Stop and listen', 'Walk around'], 1,
               'Always pause your game and listen to the crew.'),
             Q('Why do window blinds stay open for take-off and landing?', ['So everyone can see outside if needed', 'To make it hot', 'For photos'], 0,
               'Open blinds help the crew and passengers see outside during the busiest parts of the flight.', E),
             Q('How many exits should you count to on the way to your seat?', ['Just the nearest one', 'The nearest exits in front and behind', 'None'], 1,
               'Crew suggest counting the rows to the nearest exits in front of and behind you.', E),
         ]),
    dict(slug='airport-bingo', title='Airport Bingo', icon='🎯', kind='bingo', category='Airport', badge='airport_explorer', stars=20,
         blurb='Spot these at the airport — stay with your family!', need=5, items=[
             ('Plane with a special tail', '🎨'), ('Baggage vehicle', '🧳'), ('Pushback tug', '🚜'), ('Jet bridge', '🌉'),
             ('Control tower', '🗼'), ('Hi-vis safety vest', '🦺'), ('Flight information screen', '🖥️'), ('Fuel truck', '⛽'),
             ('A pilot in uniform', '🧑‍✈️')]),
    dict(slug='passenger-count', title='Guess Today’s Passenger Count', icon='🧮', kind='predict', category='Airport',
         badge='ground_ops_rookie', stars=8, generator='passengers',
         blurb='How many people are flying with you today?'),
    dict(slug='find-the-route', title='Find the Route', icon='📍', kind='map', category='Geography', badge='route_master', stars=10,
         blurb='Place today’s destination on the world map.'),
    dict(slug='match-the-vehicle', title='Match the Vehicle', icon='🚚', kind='match', category='Airport', badge='ground_ops_rookie', stars=12,
         blurb='Which airport vehicle does which job?', pairs=[
             ('🚜 Pushback tug', 'Pushes the plane back from the gate'), ('🍱 Catering truck', 'Delivers meals to the plane'),
             ('⛽ Fuel vehicle', 'Fills the wings with fuel'), ('🧳 Baggage loader', 'Lifts suitcases into the hold')]),
    dict(slug='responsible-traveller', title='Responsible Traveller', icon='✅', kind='checklist', category='Sustainability',
         badge='responsible_traveller', stars=12, need=3,
         blurb='A family checklist for super-organised cadets.', items=[
             ('We arrived at the gate on time', '⏰'), ('I kept my travel documents safe', '🛂'),
             ('I followed the boarding instructions', '👂'), ('I brought my own water bottle', '💧')]),
    dict(slug='taxiway-detective', title='Taxiway Detective', icon='🔍', kind='checklist', category='Airport', badge='airport_explorer',
         stars=10, need=3, safety='Stop and listen whenever the crew give safety instructions.',
         blurb='Look out of the window while we taxi.', items=[
             ('I spotted a runway marking', '⬜'), ('I found a yellow taxiway sign', '🟨'),
             ('I counted at least 3 different planes', '🔢'), ('I saw a plane landing, taxiing or parked', '🛬')]),
    dict(slug='mountain-master', title='Mountain Master', icon='⛰️', kind='quiz', category='Geography', badge='mountain_master', stars=15,
         generator='mountains', blurb='Mountains below the wings.', questions=[
             Q('What is the tallest mountain on Earth?', ['Mount Everest', 'Mount Fuji', 'Table Mountain'], 0,
               'Mount Everest is 8,849 m tall.'),
             Q('Is Mount Everest higher or lower than a jet’s cruising altitude (about 11,000 m)?', ['Higher', 'Lower'], 1,
               'Jets cruise about 2 km higher than the top of Everest!', E),
             Q('What is often on top of very high mountains?', ['Snow', 'Sand', 'Palm trees'], 0,
               'It is so cold up high that snow stays all year round.', J + ['explorer']),
             Q('What do we call a mountain that can erupt?', ['A volcano', 'A glacier', 'A canyon'], 0,
               'Volcanoes can erupt hot lava. Mount Fuji is a sleeping one.', J + ['explorer']),
         ]),
    dict(slug='ocean-explorer', title='Ocean Explorer', icon='🌊', kind='quiz', category='Geography', badge='ocean_explorer', stars=15,
         generator='oceans', blurb='The seas and oceans we fly over.', questions=[
             Q('Which is the biggest ocean on Earth?', ['Pacific', 'Atlantic', 'Indian'], 0, 'The Pacific covers about a third of the planet.'),
             Q('Which of these lives in the ocean?', ['Whale', 'Camel', 'Panda'], 0, 'Whales are the biggest animals in the ocean.', J),
             Q('Why do routes look curved on a flat map?', ['The Earth is round', 'Pilots get lost', 'The wind pushes them'], 0,
               'The shortest path on a globe (a great circle) looks curved on a flat map.', E),
         ]),
    dict(slug='time-zone-traveller', title='Time-Zone Traveller', icon='🕰️', kind='quiz', category='Geography', badge='route_master',
         stars=20, generator='timezone', blurb='Will we gain time or lose it?'),
    dict(slug='why-does-it-fly', title='Why Does It Fly?', icon='🪽', kind='quiz', category='Aviation', badge='junior_pilot', stars=15,
         blurb='Lift, drag, thrust and weight.', questions=[
             Q('What pushes a plane forwards?', ['Thrust from the engines', 'The wheels', 'The passengers'], 0,
               'Engines push air backwards, so the plane moves forwards.'),
             Q('Which force pulls the plane down?', ['Weight', 'Lift', 'Thrust'], 0, 'Weight (gravity) pulls everything towards the ground.'),
             Q('What do wings make as air flows over them?', ['Lift', 'Noise only', 'Rain'], 0, 'The shape of the wing turns moving air into lift.'),
             Q('What is drag?', ['Air pushing against the plane', 'A type of engine', 'Extra fuel'], 0,
               'Drag slows the plane down. Smooth shapes reduce it.', E),
             Q('Why is the cabin pressurised?', ['So we can breathe comfortably up high', 'To make it colder', 'To fly faster'], 0,
               'Air is thin at cruising height, so the cabin is kept at a comfortable pressure.', E),
             Q('What happens when wings meet bumpy air?', ['Turbulence', 'Lightning', 'Snow'], 0,
               'Turbulence is like a boat on waves. Keep your seatbelt on!', J + ['explorer']),
         ]),
    dict(slug='junior-flight-engineer', title='Junior Flight Engineer', icon='🔧', kind='quiz', category='Aviation',
         badge='junior_engineer', stars=20, blurb='Diagnose friendly aircraft puzzles.', questions=[
             Q('Which part helps the plane roll to turn?', ['Ailerons', 'Wheels', 'Windows'], 0,
               'Ailerons on the wings tilt the plane left or right.'),
             Q('Why do many planes have winglets?', ['To save fuel', 'To look cool', 'To hold lights'], 0,
               'Winglets reduce swirling air at the wingtip, which saves fuel.'),
             Q('Where is the landing gear when we cruise?', ['Folded inside the plane', 'Hanging down', 'In the cabin'], 0,
               'The gear folds up to reduce drag.'),
             Q('What changes when the flaps extend for landing?', ['The wing makes more lift at low speed', 'The engines stop', 'The plane gets lighter'], 0,
               'Flaps let the plane fly slowly and safely for landing.', E),
             Q('Which part of the tail moves the nose up and down?', ['Elevator', 'Rudder', 'Aileron'], 0,
               'The elevator controls pitch. The rudder turns the nose left and right.', S),
         ]),
    dict(slug='weather-watch', title='Weather Watch', icon='🌦️', kind='match', category='Geography', badge='weather_watcher', stars=8,
         blurb='Match each weather symbol to its name.', pairs=[
             ('☁️', 'Clouds'), ('🌧️', 'Rain'), ('💨', 'Wind'), ('⛈️', 'Thunderstorm'), ('❄️', 'Snow'), ('☀️', 'Clear sky')]),
    dict(slug='window-detective', title='Window Detective', icon='🪟', kind='checklist', category='Aviation', badge='cloud_navigator',
         stars=5, need=3, blurb='What can you see from up here? (Aisle seat? Use the moving map!)', items=[
             ('We are above / inside / below the clouds', '☁️'), ('I can see coastline, mountains, farms or city lights', '🏞️'),
             ('I know which side the sun is on', '☀️'), ('I spotted the wingtip', '🪽'), ('I found us on the moving map', '🗺️')]),
    dict(slug='design-a-tail', title='Design an Airline Tail', icon='🎨', kind='draw', category='Creative', badge='aircraft_designer',
         stars=15, prompt='Design your own tail for a future Cathay plane.', blurb='Grab your colours — the tail is your canvas.'),
    dict(slug='captains-announcement', title='Captain’s Announcement', icon='🎙️', kind='write', category='Creative',
         badge='young_storyteller', stars=12, blurb='Write a three-sentence welcome from the flight deck.',
         prompts=['Welcome everyone on board…', 'Tell them something about the route or weather…', 'Finish with a friendly goodbye…']),
    dict(slug='landing-predictor', title='Landing Predictor', icon='🔮', kind='predict', category='Geography', badge='weather_watcher',
         stars=5, blurb='Predict what we’ll find when we land. Close it before the cabin is secured!', predictions=[
             ('Will it be sunny, cloudy or rainy?', ['☀️ Sunny', '☁️ Cloudy', '🌧️ Rainy']),
             ('Will it be day or night?', ['🌞 Daytime', '🌙 Night-time']),
             ('Is the airport near a city, coast or mountains?', ['🏙️ City', '🏖️ Coast', '🏔️ Mountains'])]),
    dict(slug='arrival-checklist', title='Arrival Checklist', icon='🛬', kind='quiz', category='Culture', badge='culture_collector',
         stars=12, generator='arrival', blurb='Flag, language, local time and a landmark.'),
    dict(slug='language-explorer', title='Language Explorer', icon='🗣️', kind='checklist', category='Culture', badge='language_explorer',
         stars=15, need=3, generator='words', blurb='Learn three words and try them out loud.'),
    dict(slug='destination-history', title='Destination History', icon='📜', kind='quiz', category='Culture', badge='culture_collector',
         stars=20, generator='history', blurb='Stories from where you landed.'),
    dict(slug='flight-planning', title='Flight Planning Challenge', icon='📐', kind='quiz', category='Aviation', badge='junior_pilot',
         stars=20, blurb='Plan a flight like a real pilot.', questions=[
             Q('What do pilots check before every flight?', ['The weather and the route', 'The menu', 'The movies'], 0,
               'Weather, route, fuel and the aircraft are all checked before departure.'),
             Q('Who flies the plane?', ['The pilots in the flight deck', 'The cabin crew', 'The passengers'], 0,
               'Two pilots work together in the flight deck: the captain and the first officer.', J),
             Q('How can you tell the captain?', ['Four stripes on the sleeves', 'A red hat', 'A big badge on their shoes'], 0,
               'Captains wear four stripes; first officers wear three.', J),
             Q('Why do planes usually take off into the wind?', ['It gives more lift at a lower ground speed', 'It is quieter', 'To save time'], 0,
               'Headwind means more air over the wings, so less runway is needed.', E),
             Q('Why might a plane carry extra fuel?', ['In case it needs to wait or divert', 'To be heavier', 'For the engines to look good'], 0,
               'Pilots always plan reserves for holding or flying to another airport.', E),
             Q('A jet stream behind the plane will make the flight…', ['Shorter', 'Longer', 'No different'], 0,
               'A tailwind pushes the plane along, saving time and fuel.', E),
             Q('What does a “great circle” route do?', ['Takes the shortest path over a globe', 'Flies in circles', 'Avoids all oceans'], 0,
               'The shortest path between two points on a sphere is a great circle.', S),
         ]),
    dict(slug='planet-protector', title='Planet Protector', icon='🌱', kind='quiz', category='Sustainability', badge='planet_protector',
         stars=12, blurb='Greener ways to fly and travel.', questions=[
             Q('Which is the greenest way to get around a city?', ['Walking or cycling', 'A taxi on your own', 'A helicopter'], 0,
               'Walking and cycling make no emissions at all.'),
             Q('How can you help on board?', ['Use only what you need', 'Take extra cups', 'Leave the lights on'], 0,
               'Less waste means less weight and less rubbish.'),
             Q('What is Sustainable Aviation Fuel (SAF)?', ['Fuel made from waste and plants', 'Water', 'Extra-strong fuel'], 0,
               'SAF can be made from used cooking oil and other waste.', E),
             Q('Why do new planes like the A350 use less fuel?', ['Lighter materials and better engines', 'They fly lower', 'They carry fewer bags'], 0,
               'Carbon-fibre parts and efficient engines burn less fuel per passenger.', E),
         ]),
    dict(slug='sustainable-transport', title='Find Sustainable Transport', icon='🚲', kind='checklist', category='Sustainability',
         badge='planet_protector', stars=8, need=1, arcade=False, generator='transport',
         blurb='Use a greener way to get around the city.'),
    dict(slug='reflect-and-recap', title='Reflect & Recap', icon='💭', kind='write', category='Creative', badge='young_storyteller',
         stars=12, arcade=False, blurb='Look back on everything you discovered.',
         prompts=['The best thing I saw was…', 'Something new I learned…', 'Next time I want to…']),
]
ACTIVITY_BY_SLUG = {a['slug']: a for a in ACTIVITIES}

# ---------------------------------------------------------------- the journey (5 chapters)
# (phase, order, title, description, icon, kind, activity slug, badge, stars, track)
# kind: auto | activity | photo | land | complete. `track` limits a mission to cadets on that career track.
JOURNEY = [
    ('mission_prep', 1, 'Build Your Cadet', 'Create your avatar and choose your career tracks', '🧑‍✈️', 'auto', '', 'ready_for_takeoff', 5, ''),
    ('mission_prep', 2, 'Know Your Aircraft', 'Narrow-body or wide-body? How many engines?', '✈️', 'activity', 'know-your-aircraft', 'ready_for_takeoff', 15, ''),
    ('mission_prep', 3, 'Know Your Itinerary', 'Which way will we fly, and what will we cross?', '🧭', 'activity', 'know-your-itinerary', 'ready_for_takeoff', 15, ''),
    ('mission_prep', 4, 'Safety Star', 'Read the safety card like the crew', '🦺', 'activity', 'safety-star', 'safety_star', 10, ''),
    ('airport_explorer', 1, 'Airport Bingo', 'Spot vehicles, signs and special tails', '🎯', 'activity', 'airport-bingo', 'airport_explorer', 20, ''),
    ('airport_explorer', 2, 'Guess the Passenger Count', 'How many people are flying today?', '🧮', 'activity', 'passenger-count', 'ground_ops_rookie', 8, ''),
    ('airport_explorer', 3, 'Find the Route', 'Place the destination on the map', '📍', 'activity', 'find-the-route', 'route_master', 10, ''),
    ('airport_explorer', 4, 'Match the Vehicle', 'Which vehicle does which job?', '🚚', 'activity', 'match-the-vehicle', 'ground_ops_rookie', 12, 'airport_ops'),
    ('airport_explorer', 5, 'Responsible Traveller', 'The family checklist', '✅', 'activity', 'responsible-traveller', 'responsible_traveller', 12, ''),
    ('airport_explorer', 6, 'Taxiway Detective', 'Runway markings, taxiway signs, other planes', '🔍', 'activity', 'taxiway-detective', 'airport_explorer', 10, ''),
    ('flight_academy', 1, 'Mountain Master', 'The mountains near today’s route', '⛰️', 'activity', 'mountain-master', 'mountain_master', 15, ''),
    ('flight_academy', 2, 'Ocean Explorer', 'The seas and oceans we cross', '🌊', 'activity', 'ocean-explorer', 'ocean_explorer', 15, ''),
    ('flight_academy', 3, 'Time-Zone Traveller', 'Ahead or behind? East or west?', '🕰️', 'activity', 'time-zone-traveller', 'route_master', 20, ''),
    ('flight_academy', 4, 'Why Does It Fly?', 'Lift, drag, thrust and weight', '🪽', 'activity', 'why-does-it-fly', 'junior_pilot', 15, ''),
    ('flight_academy', 5, 'Flight Planning Challenge', 'Plan a flight like a real pilot', '📐', 'activity', 'flight-planning', 'junior_pilot', 20, 'pilot'),
    ('flight_academy', 6, 'Junior Flight Engineer', 'Friendly aircraft puzzles', '🔧', 'activity', 'junior-flight-engineer', 'junior_engineer', 20, 'engineer'),
    ('flight_academy', 7, 'Captain’s Announcement', 'Write a welcome from the flight deck', '🎙️', 'activity', 'captains-announcement', 'young_storyteller', 12, 'cabin_crew'),
    ('flight_academy', 8, 'Weather Watch', 'Match the weather symbols', '🌦️', 'activity', 'weather-watch', 'weather_watcher', 8, 'meteorologist'),
    ('flight_academy', 9, 'Sky Photographer', 'Photograph the view from your window', '📸', 'photo', '', 'junior_photographer', 10, 'photographer'),
    ('flight_academy', 10, 'Window Detective', 'Clouds, coastlines and the wingtip', '🪟', 'activity', 'window-detective', 'cloud_navigator', 5, ''),
    ('flight_academy', 11, 'Design an Airline Tail', 'A quiet creative game', '🎨', 'activity', 'design-a-tail', 'aircraft_designer', 15, ''),
    ('flight_academy', 12, 'Landing Predictor', 'Close it before the cabin is secured', '🔮', 'activity', 'landing-predictor', 'weather_watcher', 5, ''),
    ('flight_academy', 13, 'Touchdown!', 'We’ve landed — stamp your passport', '🛬', 'land', '', 'first_flight', 20, ''),
    ('destination_discovery', 1, 'Arrival Checklist', 'Flag, language, local time, landmark', '🧳', 'activity', 'arrival-checklist', 'culture_collector', 12, ''),
    ('destination_discovery', 2, 'Visit a Cultural Landmark', 'Take a photo of a famous place', '🏛️', 'photo', '', 'culture_collector', 15, ''),
    ('destination_discovery', 3, 'Learn Three Local Words', 'Say them out loud!', '🗣️', 'activity', 'language-explorer', 'language_explorer', 15, ''),
    ('destination_discovery', 4, 'Try a Local Food', 'Photograph it and give it stars', '🍜', 'photo', '', 'culture_collector', 12, ''),
    ('destination_discovery', 5, 'Destination History', 'Stories from where you landed', '📜', 'activity', 'destination-history', 'culture_collector', 20, ''),
    ('destination_discovery', 6, 'Find Sustainable Transport', 'Walk, cycle or ride the train', '🚲', 'activity', 'sustainable-transport', 'planet_protector', 8, ''),
    ('destination_discovery', 7, 'Spot a Local Animal or Plant', 'Photograph something that lives here', '🦜', 'photo', '', 'junior_photographer', 12, 'photographer'),
    ('destination_discovery', 8, 'My Destination Story', 'Enter the photo contest (with a parent’s OK)', '🏆', 'photo', '', 'junior_photographer', 20, ''),
    ('journey_home', 1, 'Reflect & Recap', 'Look back at everything you discovered', '💭', 'activity', 'reflect-and-recap', 'young_storyteller', 12, ''),
    ('journey_home', 2, 'Homeward Bound', 'Complete the journey and earn the badge', '🏡', 'complete', '', 'homeward_bound', 20, ''),
]

# Which chapter each activity belongs to, so the Arcade can feature the games for the current journey stage.
ACTIVITY_PHASE = {row[6]: row[0] for row in JOURNEY if row[6]}

CONTEST_CATEGORIES = ['Most Creative', 'Best Aviation Observation', 'Best Cultural Discovery', 'Best Sustainability Story', 'Best Drawing']


# ---------------------------------------------------------------- building an activity for a cadet

def _local_time(code, when):
    return when.astimezone(ZoneInfo(AIRPORTS[code]['tz']))


def _shuffle(question, rng):
    """Shuffle choices so the right answer isn't always first."""
    choices = list(question['choices'])
    right = choices[question['answer']]
    rng.shuffle(choices)
    return dict(question, choices=choices, answer=choices.index(right))


def _generated_questions(kind, origin, dest, aircraft, band, L, tr):
    """Route-aware questions. `L(template, **values)` translates then fills a template; `tr` translates a value."""
    o, d = AIRPORTS[origin], AIRPORTS[dest]
    ac = AIRCRAFT.get(aircraft, AIRCRAFT['A350-900'])
    city, country = tr(d['city']), tr(d['country'])
    if kind == 'aircraft':
        body = tr(ac['body'])
        out = [
            Q(L('Today’s {aircraft} is a…', aircraft=aircraft), [L('Wide-body (two aisles)'), L('Narrow-body (one aisle)')],
              0 if ac['body'] == 'wide-body' else 1, L('The {aircraft} is a {body} aircraft.', aircraft=aircraft, body=body)),
            Q(L('How many engines does the {aircraft} have?', aircraft=aircraft), ['2', '3', '4'], ['2', '3', '4'].index(str(ac['engines'])),
              L('Modern long-haul jets are so efficient that two engines are enough.')),
            Q(L('Where are suitcases carried?'), [L('In the cargo hold under the cabin'), L('On the roof'), L('In the cockpit')], 0,
              L('Bags travel in the hold, below your feet.')),
            Q(L('Who built the {aircraft}?', aircraft=aircraft), ['Airbus', 'Boeing'], 0 if ac['maker'] == 'Airbus' else 1,
              L('It was built by {maker}.', maker=ac['maker'])),
            Q(L('About how many seats does the {aircraft} have?', aircraft=aircraft),
              [L('About {n}', n=ac['seats']), L('About {n}', n=ac['seats'] // 3), L('About {n}', n=ac['seats'] * 3)], 0,
              L('Around {n} people can fly on it.', n=ac['seats']), E),
            Q(L('The {aircraft} is about {length} m long. That’s roughly…', aircraft=aircraft, length=ac['length']),
              [L('Two blue whales nose to tail'), L('One bus'), L('A football field and a half')], 0,
              L('A blue whale is about 30 m long.'), E),
        ]
    elif kind == 'itinerary':
        others = [x for x in ['west', 'south', 'north-east', 'east, across the Pacific'] if x != d['direction']][:2]
        direction = tr(d['direction'])
        out = [
            Q(L('Which way are we travelling to {city}?', city=city), [direction] + [tr(x) for x in others], 0,
              L('We fly {direction} to reach {city}.', direction=direction, city=city)),
            Q(L('Will we mostly fly over land or water?'), [L('Mostly land'), L('Mostly water')], 0 if d['mostly'] == 'land' else 1,
              L('The route crosses mostly land.') if d['mostly'] == 'land' else L('The route crosses mostly water.')),
            Q(L('What is the weather usually like in {city}?', city=city), [tr(d['climate']), L('always snowing'), L('a sandy desert')], 0,
              L('{city} is usually {climate}.', city=city, climate=tr(d['climate']))),
            Q(L('Which country is {city} in?', city=city), [country, L('Brazil'), L('Egypt')], 0,
              L('{city} is in {country}.', city=city, country=country)),
        ]
    elif kind == 'mountains':
        mountains = tr(d['mountains'])
        out = [Q(L('Which mountains are close to today’s route to {city}?', city=city), [mountains, L('The Andes'), L('The Alps of New Zealand')], 0,
                 L('Look out for {mountains} on the moving map.', mountains=mountains), E)]
    elif kind == 'oceans':
        water = tr(d['water'])
        out = [Q(L('Which water might we fly over on the way to {city}?', city=city), [water, L('The Mediterranean only'), L('The Amazon River')], 0,
                 L('On this route we can pass {water}.', water=water))]
    elif kind == 'timezone':
        now = datetime.now(ZoneInfo('UTC'))
        diff = int((_local_time(dest, now).utcoffset() - _local_time(origin, now).utcoffset()).total_seconds() // 3600)
        choices = [L('Ahead'), L('Behind'), L('The same time')]
        answer = 0 if diff > 0 else 1 if diff < 0 else 2
        n = abs(diff)
        if diff > 0:
            explain = L('{city} is 1 hour ahead of Hong Kong right now.', city=city) if n == 1 else L('{city} is {n} hours ahead of Hong Kong right now.', city=city, n=n)
        elif diff < 0:
            explain = L('{city} is 1 hour behind Hong Kong right now.', city=city) if n == 1 else L('{city} is {n} hours behind Hong Kong right now.', city=city, n=n)
        else:
            explain = L('{city} has the same time as Hong Kong right now.', city=city)
        clock = lambda h: f'{h % 24:02d}:00'
        right = clock(14 + diff)
        wrong = [w for w in (clock(17 + diff), clock(13 - diff), clock(20)) if w != right][:2]
        out = [
            Q(L('Is {city} ahead of or behind Hong Kong time?', city=city), choices, answer, explain),
            Q(L('When it’s 14:00 in Hong Kong, what time is it in {city}?', city=city), [right] + wrong, 0,
              L('Right now the time difference is {diff} hours.', diff=f'{diff:+d}'), E),
            Q(L('When it’s daytime in Hong Kong, can it be night-time somewhere else?'), [L('Yes'), L('No')], 0,
              L('Yes! When it’s lunchtime here, children in New York are fast asleep.'), J),
            Q(L('Which way does the Sun rise?'), [L('In the east'), L('In the west')], 0,
              L('The Sun rises in the east, so places further east see it first.'), J + ['explorer']),
            Q(L('Why do we have time zones?'), [L('The Earth spins, so it’s day in some places and night in others'), L('Clocks are wrong'), L('For airlines')], 0,
              L('As the Earth turns, noon arrives at different moments around the world.'), E),
        ]
    elif kind == 'arrival':
        flags = [d['flag']] + [AIRPORTS[c]['flag'] for c in ('LHR', 'NRT', 'SYD', 'JFK', 'CDG') if c != dest][:3]
        langs = [tr(x) for x in d['languages']]
        landmark = tr(d['landmark'][0])
        out = [
            Q(L('Which flag belongs to {country}?', country=country), flags, 0, L('{flag} is the flag of {country}.', flag=d['flag'], country=country)),
            Q(L('Which language do people speak in {city}?', city=city), [' & '.join(langs), L('Portuguese'), L('Swahili')], 0,
              L('In {city} you’ll hear {languages}.', city=city, languages=', '.join(langs))),
            Q(L('How do you greet someone in {city}?', city=city), [d['greeting'][0], 'Hola!', 'Jambo!'], 0,
              f'“{d["greeting"][0]}” ({tr(d["greeting"][1])}).'),
            Q(L('Which famous landmark is in {city}?', city=city), [landmark, L('The Great Pyramid'), L('Machu Picchu')], 0,
              L('{icon} {landmark} is one of the icons of {city}.', icon=d['landmark'][1], landmark=landmark, city=city)),
        ]
    elif kind == 'history':
        out = [Q(tr(q), [tr(x) for x in c], a, tr(e)) for q, c, a, e in d['history']]
    else:
        out = []
    return out


def _tr_question(q, tr):
    return dict(q, q=tr(q['q']), choices=[tr(c) for c in q['choices']], explain=tr(q['explain']))


def build_activity(slug, cadet, flight=None, lang=None):
    """Full, age-adjusted activity payload for the player, in the cadet's language. Graded in the client."""
    from .i18n import current, tr as _tr
    lang = lang or current()
    base = ACTIVITY_BY_SLUG.get(slug)
    if not base:
        return None
    tr = lambda s: _tr(s, lang)
    L = lambda tpl, **kw: _tr(tpl, lang).format(**kw)
    band = cadet.age_band
    origin, dest, aircraft = 'HKG', 'LHR', 'A350-1000'
    if flight:
        origin, dest, aircraft = flight.origin_code, flight.destination_code, flight.aircraft_type
    if dest == 'HKG':  # coming home: use the city they flew from for destination games
        dest = origin if origin in AIRPORTS and origin != 'HKG' else 'LHR'
        origin = 'HKG'
    d = AIRPORTS.get(dest, AIRPORTS['LHR'])
    rng = random.Random(f'{slug}-{cadet.id}-{dest}')
    act = {k: v for k, v in base.items() if k not in ('questions', 'generator')}
    for key in ('title', 'blurb', 'prompt', 'safety'):
        if act.get(key):
            act[key] = tr(act[key])
    if act.get('prompts'):
        act['prompts'] = [tr(p) for p in act['prompts']]
    act['route'] = dict(origin=origin, dest=dest, city=tr(d['city']), flag=d['flag'], aircraft=aircraft)

    if base['kind'] == 'quiz':
        qs = [_tr_question(q, tr) for q in base.get('questions', [])]
        if base.get('generator'):
            qs = _generated_questions(base['generator'], origin, dest, aircraft, band, L, tr) + qs
        qs = [q for q in qs if not q.get('bands') or band in q['bands']]
        limit = 4 if band == 'junior' else 5 if band == 'explorer' else 6
        act['questions'] = [_shuffle(q, rng) for q in qs[:limit]]
    elif base['kind'] in ('bingo', 'checklist'):
        items = [(tr(l), i) for l, i in base.get('items') or []]
        if base.get('generator') == 'words':
            items = [(f'{w} — {tr(m)}', '💬') for w, m in d['words']]
        elif base.get('generator') == 'transport':
            items = [(L('We used {transport}', transport=tr(d['transport'])), '🚆'), (L('We walked or cycled somewhere instead of a car'), '🚶')]
        act['items'] = [dict(label=l, icon=i) for l, i in items]
        act['need'] = min(base.get('need', len(items)), len(items))
    elif base['kind'] == 'match':
        pairs = list(base['pairs'])
        if band == 'junior':
            pairs = pairs[:4]
        act['pairs'] = [dict(left=tr(l), right=tr(r)) for l, r in pairs]
    elif base['kind'] == 'predict':
        if base.get('generator') == 'passengers':
            seats = AIRCRAFT.get(aircraft, AIRCRAFT['A350-900'])['seats']
            estimate = round(seats * (0.78 + rng.random() * 0.18))
            bucket = 0 if estimate < 150 else 1 if estimate <= 250 else 2
            act['predictions'] = [dict(q=L('How many passengers are on today’s {aircraft}?', aircraft=aircraft),
                                       options=[L('Fewer than 150'), L('150 to 250'), L('More than 250')],
                                       reveal=bucket, reveal_text=L('About {n} passengers boarded today’s {aircraft} ({seats} seats).', n=estimate, aircraft=aircraft, seats=seats))]
        else:
            act['predictions'] = [dict(q=tr(q), options=[tr(x) for x in o]) for q, o in base['predictions']]
    elif base['kind'] == 'map':
        o = AIRPORTS[origin]
        act['target'] = dict(code=dest, city=tr(d['city']), lat=d['lat'], lon=d['lon'],
                             origin=dict(code=origin, city=tr(o['city']), lat=o['lat'], lon=o['lon']))
    return act


def activity_summary(a, lang=None):
    from .i18n import tr
    return dict(slug=a['slug'], title=tr(a['title'], lang), icon=a['icon'], kind=a['kind'], category=a['category'],
                badge=a['badge'], stars=a['stars'], blurb=tr(a['blurb'], lang))
