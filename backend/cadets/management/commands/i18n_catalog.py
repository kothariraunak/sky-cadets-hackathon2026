import json
import os
import re

from django.core.management.base import BaseCommand

from cadets import ai
from cadets import content as C
from cadets import funfacts
from cadets.i18n import DIR, LANGS
from cadets.models import ExploreArticle

APP = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PLACEHOLDER = re.compile(r'\{[a-z_]+\}')


def source_strings():
    """Every English string the server can send to the app, in a stable order."""
    out = []
    add = lambda *xs: out.extend(x for x in xs if isinstance(x, str) and x.strip())

    for a in C.ACTIVITIES:
        add(a['title'], a['blurb'], a.get('prompt'), a.get('safety'), *a.get('prompts', []))
        for label, _icon in a.get('items', []):
            add(label)
        for left, right in a.get('pairs', []):
            add(left, right)
        for q, options in a.get('predictions', []):
            add(q, *options)
        for q in a.get('questions', []):
            add(q['q'], *q['choices'], q['explain'])
    for row in C.JOURNEY:
        add(row[2], row[3])
    for name, _family, _icon, desc, _metric, _tiers in C.BADGES.values():
        add(name, desc)
    add(*(name for name, _ in C.FAMILIES.values()), *C.TIER_NAMES, *(r['title'] for r in C.RANKS), *C.CONTEST_CATEGORIES)
    add(*(label for label, _badge, _fallback in ai.TOPICS.values()))
    add(*{a['body'] for a in C.AIRCRAFT.values()})
    add('west', 'south', 'north-east', 'east, across the Pacific', 'south-west')
    for d in C.AIRPORTS.values():
        add(d['city'], d['country'])
        if 'climate' not in d:
            continue
        add(*d['languages'], d['greeting'][1], d['climate'], d['mountains'], d['water'], d['transport'], d['landmark'][0])
        add(*(meaning for _word, meaning in d['words']))
        for q, choices, _answer, explain in d['history']:
            add(q, *choices, explain)
    # Templates and messages written inline in code: L('…') in content, tr('…') in views/serializers
    for path, fn in (('content.py', 'L'), ('views.py', 'tr'), ('serializers.py', 'tr')):
        with open(os.path.join(APP, path), encoding='utf-8') as f:
            add(*re.findall(fn + r"\('((?:[^'\\]|\\.)*)'", f.read()))
    for f in funfacts.FUN_FACTS:
        add(f['category'], f['title'], f['text'])
    for art in ExploreArticle.objects.all():
        add(art.title, art.category, art.summary, art.body)

    seen, unique = set(), []
    for s in out:
        if s not in seen:
            seen.add(s)
            unique.append(s)
    return unique


class Command(BaseCommand):
    help = 'Update locales/catalog.json from the game content and report missing translations.'

    def handle(self, *args, **options):
        os.makedirs(DIR, exist_ok=True)
        path = os.path.join(DIR, 'catalog.json')
        old = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
        by_text = {v: k for k, v in old.items()}
        next_id = max((int(k[1:]) for k in old), default=0) + 1
        catalog = {}
        for text in source_strings():
            key = by_text.get(text)
            if key is None:
                key = f's{next_id:04d}'
                next_id += 1
            catalog[key] = text
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(catalog, f, ensure_ascii=False, indent=1)
        words = sum(len(t.split()) for t in catalog.values())
        self.stdout.write(f'catalog: {len(catalog)} strings, ~{words} words')

        for lang in LANGS[1:]:
            lpath = os.path.join(DIR, f'{lang}.json')
            data = json.load(open(lpath, encoding='utf-8')) if os.path.exists(lpath) else {}
            missing = [k for k in catalog if not data.get(k)]
            broken = [k for k in catalog if data.get(k) and set(PLACEHOLDER.findall(catalog[k])) != set(PLACEHOLDER.findall(data[k]))]
            self.stdout.write(f'  {lang}: {len(catalog) - len(missing)}/{len(catalog)} translated'
                              + (f', placeholder mismatch: {broken[:5]}' if broken else ''))
