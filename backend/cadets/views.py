from django.contrib.auth.models import User
from django.db import transaction
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from datetime import timedelta

from . import ai
from . import content as C
from . import funfacts
from . import game
from . import hkia
from .i18n import tr
from .models import (
    ActivityCompletion, CadetMissionProgress, CadetProfile, ExploreArticle, Flight, FunFactView, GeneratedActivity,
    JournalEntry, Mission, PassportStamp,
)
from .serializers import (
    CadetMissionProgressSerializer, CadetProfileSerializer, CadetUpdateSerializer, ExploreArticleSerializer,
    FlightSerializer, JournalEntrySerializer, MissionSerializer, PassportStampSerializer,
)


def get_cadet(request):
    return request.user.cadet_profile


def create_cadet_account(email, password):
    """Login + empty cadet profile (named during onboarding).

    Accounts are invite-only: there is no public signup endpoint, they are created with
    `manage.py create_cadets`. Flights are added by scanning a boarding pass.
    """
    with transaction.atomic():
        user = User.objects.create_user(username=email, email=email, password=password)
        return CadetProfile.objects.create(user=user, cadet_name='')


def rewarded(cadet, changes=None, **extra):
    """Standard response for anything that can earn stars or badges."""
    return Response({'cadet': CadetProfileSerializer(cadet).data, 'new_badges': changes or [], **extra})


def complete_mission(cadet, mission, flight):
    """Advance a mission by one step; award its stars when it completes. Returns the progress row."""
    progress, _ = CadetMissionProgress.objects.get_or_create(cadet=cadet, mission=mission, flight=flight)
    if not progress.completed:
        progress.progress_count = min(progress.progress_count + 1, mission.target_count)
        if progress.progress_count >= mission.target_count:
            progress.completed = True
            progress.completed_at = timezone.now()
            game.award_stars(cadet, mission.stars_reward)
        progress.save()
    return progress


def complete_missions_of_kind(cadet, flight, kind):
    for mission in Mission.objects.filter(kind=kind):
        complete_mission(cadet, mission, flight)


class MeView(APIView):
    def get(self, request):
        return Response(CadetProfileSerializer(get_cadet(request)).data)

    def patch(self, request):
        """Onboarding and Settings."""
        serializer = CadetUpdateSerializer(get_cadet(request), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        cadet = serializer.save()
        return Response(CadetProfileSerializer(cadet).data)


class StatsView(APIView):
    """Lifetime stars and miles, aircraft flown and the routes for the world map."""

    def get(self, request):
        return Response(game.travel_stats(get_cadet(request)))


TIMING_FIELDS = ('departure_at', 'arrival_at', 'gate', 'terminal', 'live_status')
LIVE_REFRESH = timedelta(minutes=5)


def refresh_timing(flight, force=False):
    """Update departure, estimated landing, gate and status from HKIA (at most every 5 minutes)."""
    now = timezone.now()
    if flight.status not in ('upcoming', 'active') or flight.stage_override:
        return flight
    if not force and flight.status_checked_at and now - flight.status_checked_at < LIVE_REFRESH:
        return flight
    hkg_side = flight.arrival_at if flight.destination_code == 'HKG' and flight.arrival_at else flight.departure_at
    near = abs(now - hkg_side) < timedelta(days=2)
    info = hkia.schedule(flight.flight_number, day=hkg_side.astimezone(hkia.HKT).date()) if near else None
    if info and info['source'] == 'hkia':
        for field in TIMING_FIELDS:
            setattr(flight, field, info[field])
    flight.status_checked_at = now
    flight.save()
    return flight


class FlightViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FlightSerializer

    def get_queryset(self):
        return Flight.objects.filter(cadet=get_cadet(self.request)).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Flight number -> route, aircraft and today's timing (HKIA live data, else the timetable)."""
        day = hkia.day_from_boarding_pass(request.query_params.get('day'))
        info = hkia.schedule(request.query_params.get('number', ''), day=day)
        if not info:
            return Response({'detail': tr('We couldn’t find that Cathay flight.')}, status=status.HTTP_404_NOT_FOUND)
        return Response(dict(info, origin_name=tr(info['origin_name']), destination_name=tr(info['destination_name']),
                             origin_tz=C.AIRPORTS[info['origin_code']]['tz'], destination_tz=C.AIRPORTS[info['destination_code']]['tz']))

    @action(detail=False, methods=['post'])
    def scan(self, request):
        """Boarding pass scanned (or flight number typed): create the flight and check in.

        Mission Prep starts here, once the boarding pass is issued. Departure, landing estimate and gate
        come from HKIA so the app knows when the cadet is at the airport, on board or has landed.
        """
        cadet = get_cadet(request)
        day = hkia.day_from_boarding_pass(request.data.get('day'))
        info = hkia.schedule(str(request.data.get('flight_number', '')), day=day)
        if not info:
            return Response({'detail': tr('We couldn’t find that Cathay flight. Try CX251.')}, status=status.HTTP_404_NOT_FOUND)
        for key in ('duration_h', 'source'):
            info.pop(key)
        flight = Flight.objects.create(
            cadet=cadet, status='active', status_checked_at=timezone.now(),
            seat=str(request.data.get('seat', ''))[:5].upper(), **info,
        )
        complete_missions_of_kind(cadet, flight, 'auto')  # "Build Your Cadet" is done already
        changes = game.evaluate_badges(cadet)
        return rewarded(cadet, changes, flight=FlightSerializer(flight).data)

    @action(detail=True, methods=['post'])
    def start_journey(self, request, pk=None):
        """Check in to a flight that was added earlier (older accounts had a demo flight)."""
        flight = self.get_object()
        cadet = get_cadet(request)
        if flight.status == 'upcoming':
            flight.status = 'active'
            info = hkia.schedule(flight.flight_number)
            if info:
                for field in TIMING_FIELDS:
                    setattr(flight, field, info[field])
            flight.status_checked_at = timezone.now()
            flight.save()
            complete_missions_of_kind(cadet, flight, 'auto')
        return rewarded(cadet, game.evaluate_badges(cadet), flight=FlightSerializer(flight).data)

    @action(detail=True, methods=['post'])
    def land(self, request, pk=None):
        """Touchdown: stamp the passport with the destination and unlock Destination Discovery."""
        flight = self.get_object()
        cadet = get_cadet(request)
        new_stamp = None
        if flight.status == 'active':
            flight.status = 'landed'
            flight.landed_at = timezone.now()
            flight.save()
            dest = C.AIRPORTS.get(flight.destination_code, {})
            stamp, created = PassportStamp.objects.get_or_create(
                cadet=cadet, airport_code=flight.destination_code,
                defaults={'flight': flight, 'city_name': flight.destination_name, 'stamp_icon': dest.get('flag', '🛬')},
            )
            if created:
                new_stamp = PassportStampSerializer(stamp).data
            complete_missions_of_kind(cadet, flight, 'land')
        return rewarded(cadet, game.evaluate_badges(cadet), flight=FlightSerializer(flight).data, stamp=new_stamp)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        flight = self.get_object()
        cadet = get_cadet(request)
        if flight.status in ('active', 'landed'):
            if flight.status == 'active':  # finishing without "Touchdown" still counts as flown
                flight.landed_at = timezone.now()
            flight.status = 'completed'
            flight.save()
            complete_missions_of_kind(cadet, flight, 'complete')
        return rewarded(cadet, game.evaluate_badges(cadet), flight=FlightSerializer(flight).data)

    @action(detail=True, methods=['get'])
    def live(self, request, pk=None):
        """The flight with fresh HKIA timing: the app polls this to follow the journey stage."""
        return Response(FlightSerializer(refresh_timing(self.get_object())).data)

    @action(detail=True, methods=['post'])
    def stage(self, request, pk=None):
        """Demo tool (parent zone): pretend the journey is at a stage, or 'auto' to follow the clock again."""
        flight = self.get_object()
        wanted = request.data.get('stage')
        if wanted not in (*game.STAGES, 'auto'):
            return Response({'detail': tr('Unknown stage.')}, status=status.HTTP_400_BAD_REQUEST)
        flight.stage_override = '' if wanted == 'auto' else wanted
        flight.save(update_fields=['stage_override'])
        return Response(FlightSerializer(refresh_timing(flight, force=True)).data)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a mission part-way. Earned stars and badges are kept."""
        flight = self.get_object()
        if flight.status in ('upcoming', 'active', 'landed'):
            flight.status = 'left'
            flight.save()
        return Response(FlightSerializer(flight).data)


class MissionListView(generics.ListAPIView):
    serializer_class = MissionSerializer
    queryset = Mission.objects.all()


class MissionProgressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CadetMissionProgressSerializer

    def get_queryset(self):
        qs = CadetMissionProgress.objects.filter(cadet=get_cadet(self.request))
        flight_id = self.request.query_params.get('flight')
        if flight_id:
            qs = qs.filter(flight_id=flight_id)
        return qs

    @action(detail=False, methods=['post'])
    def advance(self, request):
        cadet = get_cadet(request)
        mission = Mission.objects.get(pk=request.data.get('mission'))
        flight = Flight.objects.get(pk=request.data.get('flight'), cadet=cadet)
        progress = complete_mission(cadet, mission, flight)
        changes = game.evaluate_badges(cadet) if progress.completed else []
        return rewarded(cadet, changes, progress=CadetMissionProgressSerializer(progress).data)


# ---------------------------------------------------------------- activities (Arcade + mission games)

class ActivityListView(APIView):
    def get(self, request):
        cadet = get_cadet(request)
        played = {}
        for slug in ActivityCompletion.objects.filter(cadet=cadet).values_list('activity', flat=True):
            played[slug] = played.get(slug, 0) + 1
        arcade = [dict(C.activity_summary(a), played=played.get(a['slug'], 0), phase=C.ACTIVITY_PHASE.get(a['slug'], ''))
                  for a in C.ACTIVITIES if a.get('arcade', True)]
        generated = [dict(slug=f'ai-{g.id}', title=g.data.get('title'), icon=g.data.get('icon'), kind='quiz',
                          category='AI', badge=ai.TOPICS.get(g.topic, ('', ''))[1], stars=15,
                          blurb=tr(ai.TOPICS.get(g.topic, ('',))[0]), played=played.get(f'ai-{g.id}', 0))
                     for g in GeneratedActivity.objects.filter(cadet=cadet).order_by('-created_at')[:6]]
        return Response({'activities': arcade, 'generated': generated, 'ai_enabled': ai.is_enabled(),
                         'ai_topics': [dict(key=k, label=tr(v[0])) for k, v in ai.TOPICS.items()]})


def _flight_for(cadet, flight_id):
    if not flight_id:
        return Flight.objects.filter(cadet=cadet, status__in=('active', 'landed')).order_by('-created_at').first()
    return Flight.objects.filter(cadet=cadet, pk=flight_id).first()


def _generated(cadet, slug):
    if not slug.startswith('ai-') or not slug[3:].isdigit():
        return None
    return GeneratedActivity.objects.filter(cadet=cadet, pk=int(slug[3:])).first()


class ActivityDetailView(APIView):
    def get(self, request, slug):
        cadet = get_cadet(request)
        gen = _generated(cadet, slug)
        if gen:
            return Response(dict(slug=slug, kind='quiz', category='AI', ai=True, model=gen.model,
                                 badge=ai.TOPICS.get(gen.topic, ('', ''))[1], stars=15,
                                 blurb=tr('Written by AI for your age and your route.'), **gen.data))
        act = C.build_activity(slug, cadet, _flight_for(cadet, request.query_params.get('flight')))
        if not act:
            raise Http404
        return Response(act)


class ActivityCompleteView(APIView):
    def post(self, request, slug):
        cadet = get_cadet(request)
        gen = _generated(cadet, slug)
        base = C.ACTIVITY_BY_SLUG.get(slug)
        if not (gen or base):
            raise Http404
        badge = ai.TOPICS.get(gen.topic, ('', ''))[1] if gen else base['badge']
        flight = _flight_for(cadet, request.data.get('flight'))
        first_time = not ActivityCompletion.objects.filter(cadet=cadet, activity=slug).exists()
        ActivityCompletion.objects.create(
            cadet=cadet, activity=slug, badge=badge, flight=flight,
            score=int(request.data.get('score') or 0), total=int(request.data.get('total') or 0),
            data=request.data.get('data') or {},
        )
        before = cadet.stars
        progress = None
        mission_id = request.data.get('mission')
        if mission_id and flight:
            mission = Mission.objects.filter(pk=mission_id).first()
            if mission:
                progress = CadetMissionProgressSerializer(complete_mission(cadet, mission, flight)).data
        if progress is None:
            # Arcade play: full stars the first time, a little for every replay. Rewards learning, not grinding.
            game.award_stars(cadet, (15 if gen else base['stars']) if first_time else 3)
        changes = game.evaluate_badges(cadet)
        cadet.refresh_from_db()
        return rewarded(cadet, changes, stars_gained=cadet.stars - before, progress=progress)


class AIQuizView(APIView):
    """Claude writes a quiz for this cadet's age band, route and career tracks."""

    def post(self, request):
        cadet = get_cadet(request)
        topic = request.data.get('topic', 'route')
        if topic not in ai.TOPICS:
            return Response({'detail': tr('Unknown topic.')}, status=status.HTTP_400_BAD_REQUEST)
        result = ai.generate_quiz(cadet, topic, _flight_for(cadet, request.data.get('flight')))
        if not result:
            # AI is switched off or unavailable: hand back the closest hand-written quiz instead.
            return Response({'ai': False, 'fallback': ai.TOPICS[topic][2]})
        data, model = result
        gen = GeneratedActivity.objects.create(cadet=cadet, topic=topic, data=data, model=model)
        return Response({'ai': True, 'slug': f'ai-{gen.id}'})


class BadgeProgressView(APIView):
    def get(self, request):
        return Response(game.badge_progress(get_cadet(request)))


# ---------------------------------------------------------------- journal, passport, explore

class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        qs = JournalEntry.objects.filter(cadet=get_cadet(self.request)).order_by('-created_at')
        flight_id = self.request.query_params.get('flight')
        if flight_id:
            qs = qs.filter(flight_id=flight_id)
        return qs

    def perform_create(self, serializer):
        # Tag the memory with where the cadet is on the journey: before, during or after the flight.
        stage, context = game.journal_context(serializer.validated_data.get('flight'))
        serializer.save(cadet=get_cadet(self.request), stage=stage, context=context)

    def perform_destroy(self, instance):
        if instance.photo:
            instance.photo.delete(save=False)
        instance.delete()

    @action(detail=True, methods=['get'])
    def photo(self, request, pk=None):
        entry = self.get_object()  # scoped to the signed-in cadet
        if not entry.photo:
            raise Http404
        response = FileResponse(entry.photo.open('rb'))
        response['Cache-Control'] = 'private, max-age=86400'
        return response


class PassportStampListView(generics.ListAPIView):
    serializer_class = PassportStampSerializer

    def get_queryset(self):
        return PassportStamp.objects.filter(cadet=get_cadet(self.request)).order_by('-earned_at')


class ExploreArticleListView(generics.ListAPIView):
    serializer_class = ExploreArticleSerializer
    queryset = ExploreArticle.objects.all()


# ---------------------------------------------------------------- fun facts

DECK_SIZE = 30


def fun_fact_deck(cadet):
    """The next 30 unread fun facts (they get gradually harder) and the ones already read, newest first."""
    seen = dict(FunFactView.objects.filter(cadet=cadet).values_list('fact_id', 'viewed_at'))
    deck = [funfacts.payload(f) for f in funfacts.FUN_FACTS if f['id'] not in seen][:DECK_SIZE]
    viewed = sorted((dict(funfacts.payload(funfacts.BY_ID[i]), viewed_at=at) for i, at in seen.items() if i in funfacts.BY_ID),
                    key=lambda f: f['viewed_at'], reverse=True)
    return dict(deck=deck, viewed=viewed, total=len(funfacts.FUN_FACTS))


class FunFactListView(APIView):
    def get(self, request):
        return Response(fun_fact_deck(get_cadet(request)))


class FunFactViewedView(APIView):
    """A card was flipped: remember it (with the date) and send the deck back with a new fact in its place."""

    def post(self, request, fact_id):
        if fact_id not in funfacts.BY_ID:
            raise Http404
        cadet = get_cadet(request)
        FunFactView.objects.get_or_create(cadet=cadet, fact_id=fact_id)
        return Response(fun_fact_deck(cadet))
