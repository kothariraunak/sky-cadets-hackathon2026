from rest_framework import serializers

from . import content as C
from . import game
from .i18n import LANGS, tr
from .models import (
    Badge, CadetBadge, CadetMissionProgress, CadetProfile, ExploreArticle, Flight,
    JournalEntry, Mission, PassportStamp,
)

SETTINGS_KEYS = {'text_scale': (int, float), 'parent_contest': bool, 'parent_sharing': bool, 'sound': bool, 'language': str}


class CadetUpdateSerializer(serializers.ModelSerializer):
    """Onboarding and Settings: the cadet's identity, age band, career tracks and preferences."""
    cadet_name = serializers.CharField(max_length=60, allow_blank=False, trim_whitespace=True, required=False)
    interests = serializers.ListField(child=serializers.ChoiceField(choices=C.INTERESTS), max_length=2, required=False)
    settings = serializers.DictField(required=False)

    class Meta:
        model = CadetProfile
        fields = ['cadet_name', 'avatar', 'age_band', 'interests', 'settings']

    def validate_settings(self, value):
        clean = {}
        for key, val in value.items():
            if key in SETTINGS_KEYS and isinstance(val, SETTINGS_KEYS[key]):
                clean[key] = val
        if 'language' in clean and clean['language'] not in LANGS:
            del clean['language']
        if 'text_scale' in clean:
            clean['text_scale'] = min(1.4, max(0.85, float(clean['text_scale'])))
        return clean

    def update(self, instance, validated):
        if 'settings' in validated:
            validated['settings'] = {**(instance.settings or {}), **validated['settings']}
        if validated.get('interests'):
            validated['interest'] = validated['interests'][0]
        return super().update(instance, validated)


class CadetProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    aviator_id = serializers.CharField(read_only=True)
    lifetime_miles = serializers.SerializerMethodField()
    rank = serializers.SerializerMethodField()

    class Meta:
        model = CadetProfile
        fields = [
            'id', 'email', 'cadet_name', 'avatar', 'interest', 'interests', 'age_band', 'settings', 'home_airport',
            'stars', 'level', 'rank_title', 'aviator_id', 'lifetime_miles', 'rank', 'created_at',
        ]

    def get_lifetime_miles(self, obj):
        return game.lifetime_miles(obj)

    def get_rank(self, obj):
        return game.rank_info(obj)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data['rank_title'] = tr(data['rank_title'])
        return data


class FlightSerializer(serializers.ModelSerializer):
    stage = serializers.SerializerMethodField()

    class Meta:
        model = Flight
        fields = [
            'id', 'flight_number', 'origin_code', 'origin_name', 'destination_code', 'destination_name',
            'aircraft_type', 'departure_at', 'arrival_at', 'status', 'seat', 'landed_at', 'cruising_altitude_ft',
            'cruising_speed_mph', 'distance_mi', 'gate', 'terminal', 'live_status', 'stage', 'stage_override',
            'created_at',
        ]

    def get_stage(self, obj):
        return game.flight_stage(obj)

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data['origin_name'] = tr(data['origin_name'])
        data['destination_name'] = tr(data['destination_name'])
        # Times are shown in each airport's own time zone, like on the departure boards.
        data['origin_tz'] = C.AIRPORTS.get(obj.origin_code, {}).get('tz', 'Asia/Hong_Kong')
        data['destination_tz'] = C.AIRPORTS.get(obj.destination_code, {}).get('tz', 'Asia/Hong_Kong')
        return data


class MissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mission
        fields = ['id', 'phase', 'title', 'description', 'icon', 'target_count', 'stars_reward', 'order',
                  'kind', 'activity', 'badge', 'track']

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data['key'] = obj.title  # stable English id for the app; title is translated
        data['title'] = tr(data['title'])
        data['description'] = tr(data['description'])
        return data


class CadetMissionProgressSerializer(serializers.ModelSerializer):
    mission = MissionSerializer(read_only=True)

    class Meta:
        model = CadetMissionProgress
        fields = ['id', 'mission', 'flight', 'progress_count', 'completed', 'completed_at']


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'code', 'name', 'description', 'icon', 'family']


class CadetBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = CadetBadge
        fields = ['id', 'badge', 'flight', 'tier', 'earned_at']


MAX_PHOTO_BYTES = 10 * 1024 * 1024


class JournalEntrySerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(write_only=True, required=False)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'flight', 'kind', 'photo', 'photo_url', 'photo_emoji', 'photo_caption', 'meal_description',
            'meal_rating', 'note', 'contest_category', 'stage', 'context', 'mood', 'prompt', 'created_at',
        ]
        read_only_fields = ['created_at', 'stage', 'context']

    def get_photo_url(self, obj):
        # Served through an authenticated endpoint, never as a public media URL.
        return f'/api/journal/{obj.id}/photo/' if obj.photo else None

    def validate_photo(self, value):
        if value.size > MAX_PHOTO_BYTES:
            raise serializers.ValidationError(tr('Photos must be under 10 MB.'))
        return value

    def validate_flight(self, flight):
        if flight and flight.cadet_id != self.context['request'].user.cadet_profile.id:
            raise serializers.ValidationError(tr('Not your flight.'))
        return flight

    def validate_contest_category(self, value):
        if not value:
            return value
        if value not in C.CONTEST_CATEGORIES:
            raise serializers.ValidationError(tr('Unknown contest category.'))
        if not (self.context['request'].user.cadet_profile.settings or {}).get('parent_contest'):
            raise serializers.ValidationError(tr('Ask a parent to allow contest entries in Settings first.'))
        return value


class PassportStampSerializer(serializers.ModelSerializer):
    flag = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()

    class Meta:
        model = PassportStamp
        fields = ['id', 'flight', 'airport_code', 'city_name', 'stamp_icon', 'flag', 'country', 'earned_at']

    def get_flag(self, obj):
        return C.AIRPORTS.get(obj.airport_code, {}).get('flag', '')

    def get_country(self, obj):
        return tr(C.AIRPORTS.get(obj.airport_code, {}).get('country', ''))

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data['city_name'] = tr(data['city_name'])
        return data


class ExploreArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExploreArticle
        fields = ['id', 'title', 'icon', 'category', 'summary', 'body', 'order']

    def to_representation(self, obj):
        data = super().to_representation(obj)
        for key in ('title', 'category', 'summary', 'body'):
            data[key] = tr(data[key])
        return data
