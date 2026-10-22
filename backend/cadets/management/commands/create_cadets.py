import secrets

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from cadets.views import create_cadet_account


class Command(BaseCommand):
    help = (
        'Create invite-only Sky Cadets accounts with random passwords. '
        'Prints "email<TAB>password" for each account it creates or resets.'
    )

    def add_arguments(self, parser):
        parser.add_argument('emails', nargs='+')
        parser.add_argument(
            '--reset-password', action='store_true',
            help='Give existing accounts a new random password instead of skipping them.',
        )

    def handle(self, *args, emails, reset_password, **options):
        for email in emails:
            email = email.strip().lower()
            password = secrets.token_urlsafe(9)
            user = User.objects.filter(username=email).first()
            if user is None:
                create_cadet_account(email, password)
            elif reset_password:
                user.set_password(password)
                user.save()
            else:
                self.stderr.write(f'{email} already exists — skipped (use --reset-password)')
                continue
            self.stdout.write(f'{email}\t{password}')
