from django.core.management.base import BaseCommand
from django.db import transaction

from cadets.models import (
    ActivityCompletion, CadetBadge, CadetMissionProgress, CadetProfile, CadetQuizAttempt, Flight,
    FunFactView, GeneratedActivity, JournalEntry, PassportStamp,
)


class Command(BaseCommand):
    help = (
        'Wipe all cadet progress (flights, missions, badges, stamps, journal, quiz, arcade and fun-fact history) '
        'and return every profile to the blank state of a freshly invited account, so the next login '
        'starts at onboarding. Logins, passwords and game content are kept.'
    )

    def add_arguments(self, parser):
        parser.add_argument('emails', nargs='*', help='Only reset these accounts (default: all).')
        parser.add_argument('--yes', action='store_true', help='Skip the confirmation prompt.')

    def handle(self, *args, emails, yes, **options):
        cadets = CadetProfile.objects.select_related('user')
        if emails:
            cadets = cadets.filter(user__username__in=[e.strip().lower() for e in emails])
        names = [c.user.username for c in cadets]
        if not names:
            self.stderr.write('No matching cadets.')
            return
        self.stdout.write('Resetting: ' + ', '.join(names))
        if not yes and input('Type "reset" to continue: ').strip() != 'reset':
            self.stderr.write('Aborted.')
            return

        with transaction.atomic():
            photos = [e.photo for e in JournalEntry.objects.filter(cadet__in=cadets).exclude(photo='')]
            for model in (CadetQuizAttempt, ActivityCompletion, GeneratedActivity, FunFactView, CadetBadge, PassportStamp,
                          JournalEntry, CadetMissionProgress, Flight):
                deleted, _ = model.objects.filter(cadet__in=cadets).delete()
                self.stdout.write(f'  {model.__name__}: {deleted} deleted')
            for cadet in cadets:
                language = (cadet.settings or {}).get('language')
                for field in ('avatar', 'interest', 'home_airport', 'stars', 'level', 'rank_title', 'age_band'):
                    setattr(cadet, field, CadetProfile._meta.get_field(field).get_default())
                cadet.cadet_name = ''
                cadet.interests = []
                cadet.settings = {'language': language} if language else {}
                cadet.save()
        for photo in photos:
            photo.delete(save=False)
        self.stdout.write(self.style.SUCCESS(f'Reset {len(names)} cadet(s); {len(photos)} photo(s) removed.'))
