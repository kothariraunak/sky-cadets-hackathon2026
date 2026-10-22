from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r'flights', views.FlightViewSet, basename='flight')
router.register(r'mission-progress', views.MissionProgressViewSet, basename='mission-progress')
router.register(r'journal', views.JournalEntryViewSet, basename='journal')

urlpatterns = [
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('stats/', views.StatsView.as_view(), name='stats'),
    path('missions/', views.MissionListView.as_view(), name='missions'),
    path('activities/', views.ActivityListView.as_view(), name='activities'),
    path('activities/ai/', views.AIQuizView.as_view(), name='ai-quiz'),
    path('activities/<slug:slug>/', views.ActivityDetailView.as_view(), name='activity'),
    path('activities/<slug:slug>/complete/', views.ActivityCompleteView.as_view(), name='activity-complete'),
    path('badge-progress/', views.BadgeProgressView.as_view(), name='badge-progress'),
    path('passport/', views.PassportStampListView.as_view(), name='passport'),
    path('explore/', views.ExploreArticleListView.as_view(), name='explore'),
    path('fun-facts/', views.FunFactListView.as_view(), name='fun-facts'),
    path('fun-facts/<int:fact_id>/viewed/', views.FunFactViewedView.as_view(), name='fun-fact-viewed'),
    path('', include(router.urls)),
]
