from django.contrib import admin

from .models import (
    ActivityCompletion, Badge, CadetBadge, CadetMissionProgress, CadetProfile, CadetQuizAttempt,
    ExploreArticle, Flight, GeneratedActivity, JournalEntry, Mission, PassportStamp, Quiz,
    QuizQuestion,
)

admin.site.register(CadetProfile)
admin.site.register(Flight)
admin.site.register(Mission)
admin.site.register(CadetMissionProgress)
admin.site.register(Badge)
admin.site.register(CadetBadge)
admin.site.register(JournalEntry)
admin.site.register(PassportStamp)
admin.site.register(Quiz)
admin.site.register(QuizQuestion)
admin.site.register(CadetQuizAttempt)
admin.site.register(ExploreArticle)
admin.site.register(ActivityCompletion)
admin.site.register(GeneratedActivity)
