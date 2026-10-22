"""Server-side translation of game content.

`locales/catalog.json` maps short ids to English source strings; `locales/<lang>.json` maps the same
ids to translations. Missing translations fall back to English.
"""
import json
import os
from contextvars import ContextVar
from functools import lru_cache

LANGS = ['en', 'zh-Hans', 'zh-HK', 'fr', 'de', 'nl', 'it', 'hi', 'ja', 'ko', 'th', 'id', 'ms']
DIR = os.path.join(os.path.dirname(__file__), 'locales')


def _load(name):
    path = os.path.join(DIR, name)
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


@lru_cache(maxsize=None)
def _catalog(lang):
    if lang == 'en':
        return {}
    source, translated = _load('catalog.json'), _load(f'{lang}.json')
    return {source[i]: t for i, t in translated.items() if i in source and t}


_current = ContextVar('sky_cadets_lang', default='en')


def current():
    return _current.get()


def tr(text, lang=None):
    """Translate an English source string into `lang` (default: the current request's language)."""
    lang = lang or _current.get()
    if not text or lang == 'en':
        return text
    return _catalog(lang).get(text, text)


def fmt(template, lang=None, **values):
    return tr(template, lang).format(**values)


def lang_of(request):
    """Language from the app's X-Language header, else Accept-Language, else English."""
    wanted = request.headers.get('X-Language') or request.headers.get('Accept-Language', '')
    for part in wanted.replace(' ', '').split(','):
        code = part.split(';')[0]
        if code in LANGS:
            return code
        base = code.split('-')[0]
        if base == 'zh':
            return 'zh-HK' if code.lower() in ('zh-hk', 'zh-mo', 'zh-tw', 'yue') else 'zh-Hans'
        if base in LANGS:
            return base
    return 'en'


class LanguageMiddleware:
    """Records the request's language so `tr()` can use it anywhere while the request is handled."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = _current.set(lang_of(request))
        try:
            return self.get_response(request)
        finally:
            _current.reset(token)
