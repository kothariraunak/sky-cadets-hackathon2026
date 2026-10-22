from django.conf import settings
from django.http import FileResponse, Http404


def spa_index(request, path=''):
    """Serve the built React app's index.html for every non-API route (client-side routing)."""
    index = settings.FRONTEND_DIST / 'index.html'
    if not index.exists():
        raise Http404('Frontend not built — run `npm run build` in frontend/.')
    response = FileResponse(open(index, 'rb'), content_type='text/html')
    response['Cache-Control'] = 'no-cache'
    return response
