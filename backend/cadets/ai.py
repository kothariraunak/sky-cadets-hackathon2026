"""AI quiz maker: Claude writes a short quiz tailored to the cadet's age band, route and career track.

Switched on by setting ANTHROPIC_API_KEY. Only non-identifying context is sent: age band,
career tracks, route and aircraft — never the child's name, email or photos.
"""
import logging
import os

from . import content as C
from .i18n import current

log = logging.getLogger(__name__)

# topic: (label, badge it counts towards, curated activity used when AI is unavailable)
TOPICS = {
    'route': ('My route', 'route_master', 'know-your-itinerary'),
    'aircraft': ('My aircraft', 'junior_engineer', 'know-your-aircraft'),
    'science': ('How planes fly', 'junior_pilot', 'why-does-it-fly'),
    'destination': ('My destination', 'culture_collector', 'destination-history'),
    'weather': ('Weather & clouds', 'weather_watcher', 'mountain-master'),
    'careers': ('My career track', 'junior_pilot', 'flight-planning'),
    'planet': ('Greener flying', 'planet_protector', 'planet-protector'),
}

BAND_STYLE = {
    'junior': 'ages 5 to 8: very short sentences, simple everyday words, exactly 3 choices, playful and encouraging',
    'explorer': 'ages 9 to 12: clear sentences, 3 or 4 choices, include one surprising fact',
    'senior': 'ages 13 to 17: deeper reasoning, real numbers where helpful, 4 choices, connect to aviation careers',
}

LANGUAGE_NAMES = {
    'en': 'British English', 'zh-Hans': 'Mandarin Chinese in Simplified characters',
    'zh-HK': 'Hong Kong Cantonese in Traditional characters (written Cantonese, as used in Hong Kong)',
    'fr': 'French', 'de': 'German', 'nl': 'Dutch', 'it': 'Italian', 'hi': 'Hindi (Devanagari script)',
    'ja': 'Japanese', 'ko': 'Korean', 'th': 'Thai', 'id': 'Indonesian', 'ms': 'Malay (Bahasa Melayu)',
}

INTEREST_LABELS = {
    'pilot': 'pilot', 'engineer': 'aircraft engineer', 'cabin_crew': 'cabin crew', 'airport_ops': 'airport operations',
    'meteorologist': 'meteorologist', 'photographer': 'destination photographer',
}

QUIZ_TOOL = {
    'name': 'save_quiz',
    'description': 'Save the finished quiz for the Sky Cadets app.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'title': {'type': 'string', 'description': 'Short, fun quiz title (max 40 characters).'},
            'icon': {'type': 'string', 'description': 'One emoji that fits the topic.'},
            'questions': {
                'type': 'array', 'minItems': 5, 'maxItems': 5,
                'items': {
                    'type': 'object',
                    'properties': {
                        'q': {'type': 'string'},
                        'choices': {'type': 'array', 'items': {'type': 'string'}, 'minItems': 3, 'maxItems': 4},
                        'answer': {'type': 'integer', 'description': 'Index of the correct choice.'},
                        'explain': {'type': 'string', 'description': 'One or two sentences that teach the answer.'},
                    },
                    'required': ['q', 'choices', 'answer', 'explain'],
                },
            },
        },
        'required': ['title', 'icon', 'questions'],
    },
}

SYSTEM = """You write quizzes for Sky Cadets, Cathay Pacific's learning programme for young travellers.
Rules:
- Every fact must be accurate and uncontroversial. If you are not sure of a fact, do not use it.
- Never ask about accidents, emergencies or crashes, and never suggest the child should judge the safety of their own flight.
- Be warm and encouraging. Write in the language the user asks for.
- Make the questions specific to the cadet's route, aircraft and interests where you can.
- Put the correct answer in a different position across questions."""


def is_enabled():
    return bool(os.environ.get('ANTHROPIC_API_KEY'))


def generate_quiz(cadet, topic, flight=None):
    """Returns (quiz dict, model name), or None when AI is off or the call fails."""
    if not is_enabled() or topic not in TOPICS:
        return None
    import anthropic

    origin, dest, aircraft = ('HKG', 'LHR', 'A350-1000') if not flight else (
        flight.origin_code, flight.destination_code, flight.aircraft_type)
    o, d = C.AIRPORTS.get(origin, {}), C.AIRPORTS.get(dest, {})
    tracks = ', '.join(INTEREST_LABELS.get(i, i) for i in (cadet.interests or [])) or 'not chosen yet'
    prompt = (
        f'Write a 5-question multiple-choice quiz on the topic "{TOPICS[topic][0]}".\n'
        f'Cadet: {BAND_STYLE[cadet.age_band]}.\n'
        f'Career tracks they are interested in: {tracks}.\n'
        f'Their flight: {o.get("city", origin)} ({origin}) to {d.get("city", dest)} ({dest}) on a {aircraft}.\n'
        f'Write everything (title, questions, choices, explanations) in {LANGUAGE_NAMES.get(current(), "British English")}.'
    )
    model = os.environ.get('AI_QUIZ_MODEL', 'claude-sonnet-5-5')
    try:
        client = anthropic.Anthropic(timeout=45)
        resp = client.messages.create(
            model=model, max_tokens=2000, system=SYSTEM, tools=[QUIZ_TOOL],
            tool_choice={'type': 'tool', 'name': 'save_quiz'},
            messages=[{'role': 'user', 'content': prompt}],
        )
        data = next(b.input for b in resp.content if b.type == 'tool_use')
    except Exception:  # network, quota or schema problems — the caller falls back to curated content
        log.exception('AI quiz generation failed')
        return None

    questions = []
    for q in data.get('questions', [])[:5]:
        choices = [str(c) for c in q.get('choices', [])][:4]
        answer = q.get('answer')
        if len(choices) >= 2 and isinstance(answer, int) and 0 <= answer < len(choices) and q.get('q'):
            questions.append(dict(q=q['q'], choices=choices, answer=answer, explain=q.get('explain', '')))
    if len(questions) < 3:
        return None
    return dict(title=str(data.get('title') or TOPICS[topic][0])[:60], icon=str(data.get('icon') or '✨')[:4],
                questions=questions), model
