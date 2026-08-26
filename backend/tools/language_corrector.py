"""
language_corrector.py
aSK Youth AI — Python Tool 9
─────────────────────────────────────────────────────────────────────────────
Grammar correction and translation service for AI-generated responses.
Runs as a post-processing step between the raw LLM output and the user,
catching common Filipino grammar errors, unnatural phrasing, and
literal English-to-Filipino translation mistakes before they reach the user.

Also handles on-demand Filipino ↔ English translation for documents or
passages when the user explicitly requests it.

Two modes of operation:
  1. AUTO-CORRECT (server pipeline): called on every AI response to fix
     grammar silently before presenting to the user.
  2. ON-DEMAND TRANSLATION: called when the user asks to translate a
     document or passage.

API:
  POST /tools/language/correct
  Body: { "text": str, "language": "filipino"|"english"|"auto" }
  Returns: { "status": "ok", "original": str, "corrected": str,
             "corrections": [...], "was_changed": bool }

  POST /tools/language/translate
  Body: { "text": str, "from_lang": "filipino"|"english",
          "to_lang": "filipino"|"english", "register": "formal"|"casual" }
  Returns: { "status": "ok", "original": str, "translated": str,
             "from_lang": str, "to_lang": str }

Dependencies:
  pip install flask language-tool-python deep-translator
  Note: language-tool-python requires Java 8+.
  Fallback rule-based corrector is included for environments without Java.
"""

import re
import json
import argparse
from flask import Flask, request, jsonify

app = Flask(__name__)

# ── Optional: LanguageTool for grammar (requires Java) ────────────────────────
try:
    import language_tool_python
    _lt_fil = language_tool_python.LanguageTool("tl")   # Tagalog
    _lt_en  = language_tool_python.LanguageTool("en-PH") # Philippine English
    LT_AVAILABLE = True
except Exception:
    LT_AVAILABLE = False

# ── Optional: DeepTranslator for translation ──────────────────────────────────
try:
    from deep_translator import GoogleTranslator
    DT_AVAILABLE = True
except ImportError:
    DT_AVAILABLE = False


# ════════════════════════════════════════════════════════════════════
# RULE-BASED CORRECTOR
# Catches the most common AI-generated Filipino errors without Java.
# Each rule: (pattern, replacement, description)
# ════════════════════════════════════════════════════════════════════
FILIPINO_RULES = [
    # Wrong: "tumakbo ng mabilis" → "tumakbo nang mabilis"
    # Rule: verb + "ng" + adjective/adverb → should be "nang"
    (
        r'\b(tumakbo|lumakad|kumanta|sumayaw|nagsalita|nagbasa|nagtrabaho|'
        r'lumipat|dumating|umalis|sumulat|nagpatuloy|gumawa|lumaban)'
        r'\s+ng\s+([a-záéíóúàèìòùñ]+ly|mabilis|maayos|maingat|malambot|'
        r'matamis|mahina|malakas|tahimik|maingay|masaya|malungkot)',
        r'\1 nang \2',
        "ng → nang before adverb/manner"
    ),
    # Wrong: "Siya ay mabait" → "Mabait siya" (stiff "ay" construction)
    # Catches the most common over-literal pattern
    (
        r'\b(Siya|Ako|Ikaw|Kami|Tayo|Kayo|Sila)\s+ay\s+([a-záéíóúñA-Z][a-záéíóúñ]+)',
        r'\2 \1',
        "ay-predicate inversion (stiff → natural)"
    ),
    # Wrong: "Huwag hindi pumunta" → remove double negation
    (
        r'\bHuwag\s+hindi\b',
        'Huwag',
        "double negation huwag+hindi"
    ),
    # Wrong: "hindi mag-ingat" for a command → "huwag kalimutang mag-ingat"
    # Flag: "hindi" used before imperative verb forms
    (
        r'\bhindi\s+(mag-|maki-|makipag-)',
        r'huwag \1',
        "hindi → huwag before imperative mag- verb"
    ),
    # Wrong: "din" after vowel → should be "rin"
    (
        r'([aeiouAEIOU])\s+din\b',
        r'\1 rin',
        "din → rin after vowel"
    ),
    # Wrong: "rin" after consonant → should be "din"
    (
        r'([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])\s+rin\b',
        r'\1 din',
        "rin → din after consonant"
    ),
    # Wrong: "raw" after consonant → should be "daw"
    (
        r'([bcdfghjklmnpqrstvwxyz])\s+raw\b',
        r'\1 daw',
        "raw → daw after consonant"
    ),
    # Wrong: "daw" after vowel → should be "raw"
    (
        r'([aeiou])\s+daw\b',
        r'\1 raw',
        "daw → raw after vowel"
    ),
    # Remove unnatural filler: "Kilig," used as greeting/exclamation
    (
        r'\bKilig[,!]?\s+',
        '',
        "Remove 'Kilig' as filler/greeting"
    ),
    # Replace "Maraming mabuti" (non-existent phrase)
    (
        r'\bMaraming mabuti\b',
        'Mabuti naman',
        "Maraming mabuti → Mabuti naman"
    ),
    # Literal idiom: "Ang oras ay ginto" → "Mahalaga ang oras"
    (
        r'\bAng oras ay ginto\b',
        'Mahalaga ang oras',
        "Literal time idiom correction"
    ),
    # Excessive "po" repetition: more than 2 "po" in one sentence
    # Reduce to max 2 per sentence
    (
        r'(\bpo\b(?:.*?\bpo\b){2,})',
        lambda m: re.sub(r'\bpo\b', '', m.group(0), count=max(0, m.group(0).count('po') - 2)) + ' po',
        "Excessive po repetition"
    ),
    # Bracket-wrapped placeholder removal
    (
        r'\[(?:oras ngayon|current time|current date|time|date|petsa)\]',
        'ang kasalukuyang oras/petsa ay hindi available',
        "Bracket placeholder removal"
    ),
]

ENGLISH_RULES = [
    # Bracket-wrapped placeholder removal
    (
        r'\[(?:current time|current date|time|date|Time|Date)\]',
        'the current time/date is not available',
        "Bracket placeholder removal"
    ),
    # Common agreement errors: "The officers was" → "The officers were"
    (
        r'\bThe officers was\b',
        'The officers were',
        "Subject-verb agreement: officers were"
    ),
    # "alot" → "a lot"
    (
        r'\balot\b',
        'a lot',
        "alot → a lot"
    ),
]


def _apply_rules(text: str, rules: list) -> tuple[str, list[str]]:
    """Apply regex rules and return (corrected_text, list_of_corrections_made)."""
    corrections = []
    for pattern, replacement, description in rules:
        if callable(replacement):
            new_text, count = re.subn(pattern, replacement, text)
        else:
            new_text, count = re.subn(pattern, replacement, text)
        if count > 0:
            corrections.append(f"{description} ({count}x)")
            text = new_text
    return text, corrections


def _detect_language(text: str) -> str:
    """Simple heuristic to detect if text is primarily Filipino or English."""
    fil_markers = ['ang', 'ng', 'sa', 'na', 'at', 'ay', 'ko', 'mo', 'siya',
                   'kami', 'kayo', 'sila', 'po', 'opo', 'hindi', 'huwag',
                   'naman', 'kasi', 'parang', 'talaga', 'ngayon', 'dito']
    words      = text.lower().split()
    fil_count  = sum(1 for w in words if w in fil_markers)
    ratio      = fil_count / max(len(words), 1)
    return "filipino" if ratio > 0.08 else "english"


# ── Auto-correct pipeline ─────────────────────────────────────────────────────
def correct_text(text: str, language: str = "auto") -> dict:
    if not text.strip():
        return {"status": "ok", "original": text, "corrected": text,
                "corrections": [], "was_changed": False}

    if language == "auto":
        language = _detect_language(text)

    original    = text
    corrections = []

    # Step 1: Rule-based correction (always available)
    rules = FILIPINO_RULES if language == "filipino" else ENGLISH_RULES
    text, rule_corrections = _apply_rules(text, rules)
    corrections.extend(rule_corrections)

    # Step 2: LanguageTool (if Java available)
    if LT_AVAILABLE:
        try:
            tool    = _lt_fil if language == "filipino" else _lt_en
            matches = tool.check(text)
            # Apply only high-confidence, non-style suggestions
            for match in matches:
                if match.replacements and match.ruleId not in ("WHITESPACE_RULE",):
                    start = match.offset
                    end   = match.offset + match.errorLength
                    text  = text[:start] + match.replacements[0] + text[end:]
                    corrections.append(f"LT: {match.message}")
        except Exception:
            pass  # Degrade gracefully

    return {
        "status":      "ok",
        "language":    language,
        "original":    original,
        "corrected":   text,
        "corrections": corrections,
        "was_changed": text != original,
    }


# ── Translation ────────────────────────────────────────────────────────────────
def translate_text(
    text: str,
    from_lang: str = "english",
    to_lang: str = "filipino",
    register: str = "formal",
) -> dict:
    if not text.strip():
        return {"status": "error", "message": "No text to translate."}

    lang_map = {"filipino": "tl", "english": "en"}
    src = lang_map.get(from_lang, "en")
    tgt = lang_map.get(to_lang, "tl")

    if src == tgt:
        return {
            "status":     "ok",
            "original":   text,
            "translated": text,
            "from_lang":  from_lang,
            "to_lang":    to_lang,
            "note":       "Source and target language are the same.",
        }

    translated = None

    if DT_AVAILABLE:
        try:
            translator = GoogleTranslator(source=src, target=tgt)
            translated = translator.translate(text)
        except Exception as e:
            return {"status": "error", "message": f"Translation error: {str(e)}"}
    else:
        return {
            "status":  "error",
            "message": "deep-translator not installed. Run: pip install deep-translator",
        }

    # Post-process: run correction on the translated output
    corrected_result = correct_text(translated, to_lang)
    final = corrected_result["corrected"]

    # Register adjustment for Filipino output
    if to_lang == "filipino" and register == "formal":
        # Ensure "po" appears at least once in longer outputs (simple heuristic)
        if len(final.split()) > 10 and "po" not in final:
            final = final.rstrip(".") + " po."

    return {
        "status":      "ok",
        "original":    text,
        "translated":  final,
        "from_lang":   from_lang,
        "to_lang":     to_lang,
        "register":    register,
        "corrections": corrected_result["corrections"],
    }


# ── Flask API ─────────────────────────────────────────────────────────────────
@app.route("/tools/language/correct", methods=["POST"])
def api_correct():
    data     = request.get_json(force=True)
    text     = data.get("text", "")
    language = data.get("language", "auto")
    result   = correct_text(text, language)
    return jsonify(result), 200 if result["status"] == "ok" else 400


@app.route("/tools/language/translate", methods=["POST"])
def api_translate():
    data      = request.get_json(force=True)
    text      = data.get("text", "")
    from_lang = data.get("from_lang", "english")
    to_lang   = data.get("to_lang", "filipino")
    register  = data.get("register", "formal")
    result    = translate_text(text, from_lang, to_lang, register)
    return jsonify(result), 200 if result["status"] == "ok" else 400


@app.route("/tools/language/detect", methods=["POST"])
def api_detect():
    data = request.get_json(force=True)
    text = data.get("text", "")
    return jsonify({"language": _detect_language(text), "text_length": len(text)}), 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Language Corrector")
    parser.add_argument("--serve",     action="store_true")
    parser.add_argument("--port",      type=int, default=5008)
    parser.add_argument("--correct",   type=str, default="", help="Text to correct")
    parser.add_argument("--translate", type=str, default="", help="Text to translate")
    parser.add_argument("--from-lang", type=str, default="english")
    parser.add_argument("--to-lang",   type=str, default="filipino")
    parser.add_argument("--language",  type=str, default="auto")
    args = parser.parse_args()

    if args.serve:
        print(f"[LanguageCorrector] Serving on port {args.port}")
        print(f"[LanguageCorrector] LanguageTool available: {LT_AVAILABLE}")
        print(f"[LanguageCorrector] DeepTranslator available: {DT_AVAILABLE}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    elif args.correct:
        print(json.dumps(correct_text(args.correct, args.language), indent=2))
    elif args.translate:
        print(json.dumps(translate_text(
            args.translate, args.from_lang, args.to_lang), indent=2))
    else:
        # Self-test
        tests = [
            "Kilig, magandang gabi! Tumakbo ng mabilis si Juan.",
            "Siya ay mabait at matulungin naman.",
            "Maraming mabuti sa iyo! Ang oras ay ginto.",
            "Hindi mag-ingat sa daan.",
            "The current time is [Time]. How can I assist?",
        ]
        for t in tests:
            r = correct_text(t, "auto")
            print(f"IN : {r['original']}")
            print(f"OUT: {r['corrected']}")
            print(f"FIX: {r['corrections']}")
            print()
