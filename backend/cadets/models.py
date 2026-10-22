from django.contrib.auth.models import User
from django.db import models

AVATAR_CHOICES = [
    ('boy_pilot', 'Boy Pilot'),
    ('girl_pilot', 'Girl Pilot'),
]

INTEREST_CHOICES = [
    ('pilot', 'Pilot'),
    ('engineer', 'Engineer'),
    ('cabin_crew', 'Cabin Crew'),
    ('airport_ops', 'Airport Operations'),
    ('meteorologist', 'Meteorologist'),
    ('photographer', 'Destination Photographer'),
]

AGE_BAND_CHOICES = [
    ('junior', 'Junior Cadet (5-8)'),
    ('explorer', 'Explorer (9-12)'),
    ('senior', 'Senior Cadet (13-17)'),
]


class CadetProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cadet_profile')
    cadet_name = models.CharField(max_length=60)
    avatar = models.CharField(max_length=20, choices=AVATAR_CHOICES, default='boy_pilot')
    interest = models.CharField(max_length=20, choices=INTEREST_CHOICES, default='pilot')
    home_airport = models.CharField(max_length=3, default='HKG')
    stars = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    rank_title = models.CharField(max_length=60, default='New Recruit')
    age_band = models.CharField(max_length=10, choices=AGE_BAND_CHOICES, default='explorer')
    interests = models.JSONField(default=list, blank=True)  # up to two career tracks
    settings = models.JSONField(default=dict, blank=True)  # text size, parent permissions
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def aviator_id(self):
        return f'SC-{self.created_at.year if self.created_at else 2026}-{self.id:05d}'

    def __str__(self):
        return self.cadet_name


class Flight(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('active', 'Checked in'),
        ('landed', 'Landed'),
        ('completed', 'Completed'),
        ('left', 'Left'),
    ]
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='flights')
    flight_number = models.CharField(max_length=10)
    origin_code = models.CharField(max_length=3)
    origin_name = models.CharField(max_length=80)
    destination_code = models.CharField(max_length=3)
    destination_name = models.CharField(max_length=80)
    aircraft_type = models.CharField(max_length=40, default='A350-1000')
    departure_at = models.DateTimeField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='upcoming')
    cruising_altitude_ft = models.PositiveIntegerField(default=38000)
    cruising_speed_mph = models.PositiveIntegerField(default=560)
    distance_mi = models.PositiveIntegerField(default=0)
    seat = models.CharField(max_length=5, blank=True)
    landed_at = models.DateTimeField(null=True, blank=True)
    # Live timing (from HKIA, else the timetable): drives the journey stage the app shows.
    arrival_at = models.DateTimeField(null=True, blank=True)  # estimated landing
    gate = models.CharField(max_length=8, blank=True)
    terminal = models.CharField(max_length=4, blank=True)
    live_status = models.CharField(max_length=40, blank=True)
    status_checked_at = models.DateTimeField(null=True, blank=True)
    stage_override = models.CharField(max_length=12, blank=True)  # demo: pretend to be at this stage
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.flight_number} {self.origin_code}-{self.destination_code}'


PHASE_CHOICES = [
    ('mission_prep', 'Mission Prep'),
    ('airport_explorer', 'Airport Explorer'),
    ('flight_academy', 'Flight Academy'),
    ('destination_discovery', 'Destination Discovery'),
    ('journey_home', 'Journey Home'),
]


class Mission(models.Model):
    phase = models.CharField(max_length=30, choices=PHASE_CHOICES)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=240, blank=True)
    icon = models.CharField(max_length=10, default='star')
    target_count = models.PositiveIntegerField(default=1)
    stars_reward = models.PositiveIntegerField(default=10)
    order = models.PositiveIntegerField(default=0)
    kind = models.CharField(max_length=12, default='activity')  # auto | activity | photo | land | complete
    activity = models.CharField(max_length=40, blank=True)  # slug in cadets.content.ACTIVITIES
    badge = models.CharField(max_length=40, blank=True)
    track = models.CharField(max_length=20, blank=True)  # only shown to cadets on this career track

    class Meta:
        ordering = ['phase', 'order']

    def __str__(self):
        return self.title


class CadetMissionProgress(models.Model):
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='mission_progress')
    mission = models.ForeignKey(Mission, on_delete=models.CASCADE, related_name='progress')
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='mission_progress', null=True, blank=True)
    progress_count = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('cadet', 'mission', 'flight')

    def __str__(self):
        return f'{self.cadet} - {self.mission}'


class Badge(models.Model):
    code = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200)
    icon = models.CharField(max_length=10, default='medal')
    criteria = models.CharField(max_length=200, blank=True)
    family = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.name


class CadetBadge(models.Model):
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='awarded_to')
    flight = models.ForeignKey(Flight, on_delete=models.SET_NULL, related_name='badges_earned', null=True, blank=True)
    tier = models.PositiveSmallIntegerField(default=1)  # 1 bronze, 2 silver, 3 gold
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cadet', 'badge')

    def __str__(self):
        return f'{self.cadet} earned {self.badge}'


class JournalEntry(models.Model):
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='journal_entries')
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='journal_entries', null=True, blank=True)
    photo_emoji = models.CharField(max_length=10, default='📷')
    photo_caption = models.CharField(max_length=120, blank=True)
    meal_description = models.CharField(max_length=120, blank=True)
    meal_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    kind = models.CharField(max_length=12, default='note')  # note | photo | drawing | story | meal | mood
    stage = models.CharField(max_length=12, blank=True)  # pre_flight | in_flight | post_flight, from the flight status
    context = models.JSONField(default=dict, blank=True)  # where the cadet was: journey stage, gate, city, timing
    mood = models.CharField(max_length=10, blank=True)
    prompt = models.CharField(max_length=160, blank=True)  # the journal prompt this entry answers
    photo = models.ImageField(upload_to='journal/%Y/%m/', blank=True)
    contest_category = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Journal {self.cadet} / {self.flight}'


class PassportStamp(models.Model):
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='passport_stamps')
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='passport_stamps')
    airport_code = models.CharField(max_length=3)
    city_name = models.CharField(max_length=80)
    stamp_icon = models.CharField(max_length=10, default='🗺️')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cadet', 'airport_code')

    def __str__(self):
        return f'{self.cadet} stamp {self.airport_code}'


class Quiz(models.Model):
    phase = models.CharField(max_length=30, choices=PHASE_CHOICES, default='flight_academy')
    title = models.CharField(max_length=120)
    icon = models.CharField(max_length=10, default='❓')

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.CharField(max_length=240)
    choices = models.JSONField(default=list)
    correct_index = models.PositiveSmallIntegerField()
    explanation = models.CharField(max_length=240, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.question_text


class CadetQuizAttempt(models.Model):
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='quiz_attempts')
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name='attempts')
    selected_index = models.PositiveSmallIntegerField()
    is_correct = models.BooleanField()
    attempted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.cadet} -> {self.question_id}'


class ExploreArticle(models.Model):
    title = models.CharField(max_length=120)
    icon = models.CharField(max_length=10, default='🌍')
    category = models.CharField(max_length=60, default='Aviation Facts')
    summary = models.CharField(max_length=200)
    body = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


class ActivityCompletion(models.Model):
    """A cadet finished an activity (from a journey mission or the Arcade)."""
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='activity_completions')
    activity = models.CharField(max_length=40)
    badge = models.CharField(max_length=40, blank=True)
    flight = models.ForeignKey(Flight, on_delete=models.SET_NULL, null=True, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    total = models.PositiveSmallIntegerField(default=0)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class GeneratedActivity(models.Model):
    """An AI-written quiz, tailored to one cadet's age band, route and career track."""
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='generated_activities')
    topic = models.CharField(max_length=40)
    data = models.JSONField(default=dict)
    model = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class FunFactView(models.Model):
    """A fun fact the cadet has flipped over (ids from `cadets.funfacts.FUN_FACTS`)."""
    cadet = models.ForeignKey(CadetProfile, on_delete=models.CASCADE, related_name='fun_facts_viewed')
    fact_id = models.PositiveIntegerField()
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cadet', 'fact_id')
