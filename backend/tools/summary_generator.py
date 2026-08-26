"""
summary_generator.py
aSK Youth AI — Python Tool 5
─────────────────────────────────────────────────────────────────────────────
Generates concise summaries of uploaded documents or free text blocks.
Called by the AI when the user asks to summarize a document, a meeting
transcript, or any block of text. Removes the summarization burden from
the AI's context window by doing the heavy lifting here first.

Returns a structured summary the AI can present directly.

API:
  POST /tools/summary
  Body: {
    "source": "rag"|"text",
    "text": str,             (required if source=text)
    "rag_chunks": [...],     (optional; passed by server from RAG retrieval)
    "language": "filipino"|"english",
    "style": "bullets"|"prose"
  }
  Returns: { "status": "ok", "summary": str, "key_points": [...],
             "word_count_original": int, "word_count_summary": int }

Dependencies:
  pip install flask sumy nltk
  python -m nltk.downloader punkt stopwords
"""

import json
import os
import argparse
import re
from flask import Flask, request, jsonify

app = Flask(__name__)

# Optional extractive summarizer — gracefully degrade to simple truncation
try:
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers    import Tokenizer
    from sumy.summarizers.lsa   import LsaSummarizer
    from sumy.nlp.stemmers      import Stemmer
    from sumy.utils             import get_stop_words
    SUMY_AVAILABLE = True
except ImportError:
    SUMY_AVAILABLE = False


def _extractive_summary(text: str, sentence_count: int = 5, language: str = "english") -> list[str]:
    """Use LSA extractive summarization if sumy is available, else take first N sentences."""
    if SUMY_AVAILABLE:
        try:
            lang = "english" if language == "english" else "english"  # sumy lacks Filipino; use English model
            parser     = PlaintextParser.from_string(text, Tokenizer(lang))
            stemmer    = Stemmer(lang)
            summarizer = LsaSummarizer(stemmer)
            summarizer.stop_words = get_stop_words(lang)
            sentences  = [str(s) for s in summarizer(parser.document, sentence_count)]
            return sentences
        except Exception:
            pass

    # Fallback: split by sentence and return first N
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return sentences[:sentence_count]


def generate_summary(
    text: str,
    language: str = "english",
    style: str = "bullets",
    rag_chunks: list = None,
) -> dict:
    # Combine RAG chunks if provided
    if rag_chunks:
        combined = "\n\n".join(
            c.get("content", c) if isinstance(c, dict) else str(c)
            for c in rag_chunks
        )
        text = combined + "\n\n" + text if text else combined

    text = text.strip()
    if not text:
        return {"status": "error", "message": "No text provided to summarize."}

    original_wc = len(text.split())
    key_points  = _extractive_summary(text, sentence_count=6, language=language)

    if style == "bullets":
        if language == "filipino":
            summary = "Mga pangunahing punto:\n" + "\n".join(f"• {p}" for p in key_points)
        else:
            summary = "Key points:\n" + "\n".join(f"• {p}" for p in key_points)
    else:
        summary = " ".join(key_points)

    return {
        "status":               "ok",
        "language":             language,
        "style":                style,
        "summary":              summary,
        "key_points":           key_points,
        "word_count_original":  original_wc,
        "word_count_summary":   len(summary.split()),
    }


@app.route("/tools/summary", methods=["POST"])
def api_summary():
    data       = request.get_json(force=True)
    source     = data.get("source", "text")
    text       = data.get("text", "")
    rag_chunks = data.get("rag_chunks", [])
    language   = data.get("language", "english").lower()
    style      = data.get("style", "bullets").lower()

    result = generate_summary(text, language, style, rag_chunks if source == "rag" else None)
    status_code = 200 if result["status"] == "ok" else 400
    return jsonify(result), status_code


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Summary Generator")
    parser.add_argument("--serve",    action="store_true")
    parser.add_argument("--port",     type=int, default=5005)
    parser.add_argument("--text",     type=str, default="")
    parser.add_argument("--language", type=str, default="english")
    parser.add_argument("--style",    type=str, default="bullets")
    args = parser.parse_args()

    if args.serve:
        print(f"[SummaryGenerator] Serving on port {args.port}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        result = generate_summary(args.text, args.language, args.style)
        print(json.dumps(result, indent=2))
