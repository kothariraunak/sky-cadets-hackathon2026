from django.core.management.base import BaseCommand

from cadets import content as C
from cadets.models import Badge, ExploreArticle, Mission


class Command(BaseCommand):
    help = 'Sync missions and badges from cadets/content.py and seed the Explore fact cards. Safe to re-run.'

    def add_arguments(self, parser):
        parser.add_argument('--if-empty', action='store_true', help='Kept for compatibility; seeding is always safe now.')

    def handle(self, *args, **options):
        self.seed_missions()
        self.seed_badges()
        self.seed_explore()
        self.stdout.write(self.style.SUCCESS('Sky Cadets content synced.'))

    def seed_missions(self):
        keep = []
        for phase, order, title, desc, icon, kind, activity, badge, stars, track in C.JOURNEY:
            m, _ = Mission.objects.update_or_create(
                phase=phase, title=title,
                defaults=dict(description=desc, icon=icon, kind=kind, activity=activity, badge=badge,
                              stars_reward=stars, order=order, track=track, target_count=1),
            )
            keep.append(m.id)
        stale = Mission.objects.exclude(id__in=keep)
        self.stdout.write(f'  missions: {len(keep)} (removed {stale.count()} old)')
        stale.delete()

    def seed_badges(self):
        for code, (name, family, icon, desc, _metric, _tiers) in C.BADGES.items():
            Badge.objects.update_or_create(code=code, defaults=dict(name=name, family=family, icon=icon, description=desc))
        stale = Badge.objects.exclude(code__in=C.BADGES.keys())
        self.stdout.write(f'  badges: {len(C.BADGES)} (removed {stale.count()} old)')
        stale.delete()

    def seed_explore(self):
        articles = [
            ('How Do Airplanes Fly?', '🛫', 'Aircraft', 'The secret is in the shape of the wings.',
             'Airplane wings are curved on top and flatter on the bottom. As air moves over the wing, it creates '
             'a force called lift that pushes the plane upward. Combined with engine thrust pushing the plane '
             'forward, lift is what keeps a 200-tonne jet in the sky!', 1),
            ('The A350: A Gentle Giant', '✈️', 'Aircraft', 'Meet the aircraft flying you today.',
             'The Airbus A350-1000 can carry over 350 passengers and fly more than 8,000 miles without stopping. '
             'Its wings are partly made of carbon fibre, making it lighter and more fuel efficient than older jets.', 2),
            ('Clouds 101', '☁️', 'Weather', 'Learn to spot cumulus, cirrus and stratus clouds.',
             'Cumulus clouds look like fluffy cotton balls and usually mean fair weather. Cirrus clouds are thin '
             'and wispy, found high in the sky. Stratus clouds form flat, grey layers that can bring drizzle.', 3),
            ('Why Do Ears Pop on a Plane?', '👂', 'Science', 'The cabin pressure explained simply.',
             'As a plane climbs, air pressure outside drops. Your middle ear has trapped air that needs to '
             'equalize, which is why swallowing, yawning, or chewing gum can help your ears feel better.', 4),
            ('Passport Stamps Around the World', '🛂', 'Culture', 'Every stamp tells a story.',
             'Many countries design unique passport stamps featuring local landmarks, animals, or symbols. '
             'Collecting stamps is like building a scrapbook of your adventures across the globe.', 5),
            ('Life of a Pilot', '👨‍✈️', 'Careers', 'What does it take to fly for a living?',
             'Pilots train for years, learning navigation, weather patterns, and how to handle emergencies. '
             'They work closely with air traffic control and their co-pilot to get everyone safely to their destination.', 6),
        ]
        if ExploreArticle.objects.count() == 0:
            for title, icon, category, summary, body, order in articles:
                ExploreArticle.objects.create(
                    title=title, icon=icon, category=category, summary=summary, body=body, order=order,
                )
        self.stdout.write(f'  explore articles: {ExploreArticle.objects.count()}')
