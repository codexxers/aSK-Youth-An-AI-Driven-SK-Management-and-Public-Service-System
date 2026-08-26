"""
context_manager.py
aSK Youth AI — Python Tool 8
─────────────────────────────────────────────────────────────────────────────
Manages chat history to prevent context window overflow at 32768 tokens.
Called by server.js before every AI request to ensure the message array
never exceeds the token budget.

Strategy — Tiered compression:
  Tier 1 (safe zone):   history fits within budget → pass through untouched
  Tier 2 (soft limit):  approaching budget → summarize oldest third of history
  Tier 3 (hard limit):  at budget → drop oldest messages, keep system prompt
                        + last N turns + a compressed summary of earlier turns

This replaces the raw "UPLINK FAILED: Failed to compress" error from
node-llama-cpp with a graceful, transparent compression that preserves
conversational coherence.

API:
  POST /tools/context
  Body: {
    "messages":    [ { "role": str, "content": str }, ... ],
    "system_prompt_tokens": int,    ← token count of current system prompt
    "context_size": int,            ← total context window (e.g. 32768)
    "reserve_tokens": int           ← tokens to keep free for next response (default 1500)
  }
  Returns: {
    "status":           "ok",
    "messages":         [...],      ← trimmed/compressed message array
    "was_compressed":   bool,
    "original_turns":   int,
    "final_turns":      int,
    "tokens_used":      int,
    "tokens_available": int
  }

server.js integration:
  Before every LLM call:
    const managed = await fetch('http://localhost:5007/tools/context', {
      method: 'POST',
      body: JSON.stringify({
        messages: chatHistory,
        system_prompt_tokens: 1200,
        context_size: 32768,
        reserve_tokens: 1500
      })
    }).then(r => r.json());
    chatHistory = managed.messages;   // use the managed array going forward

Dependencies:
  pip install flask tiktoken
  (tiktoken is used for fast approximate token counting — cl100k_base encoding
   approximates Qwen 2.5's tokenizer closely enough for budget management)
"""

import json
import argparse
from flask import Flask, request, jsonify

app = Flask(__name__)

# Token counting — use tiktoken if available, else rough word-based estimate
try:
    import tiktoken
    _enc = tiktoken.get_encoding("cl100k_base")
    def count_tokens(text: str) -> int:
        return len(_enc.encode(text))
    TIKTOKEN_AVAILABLE = True
except ImportError:
    def count_tokens(text: str) -> int:
        # Rough estimate: 1 token ≈ 0.75 words for English/Filipino mix
        return max(1, int(len(text.split()) * 1.35))
    TIKTOKEN_AVAILABLE = False


# ── Token counting helpers ────────────────────────────────────────────────────
def count_message_tokens(msg: dict) -> int:
    """Counts tokens for a single message dict {role, content}."""
    # +4 per message for role/formatting overhead (standard llama.cpp estimate)
    return count_tokens(msg.get("content", "")) + 4


def count_history_tokens(messages: list[dict]) -> int:
    return sum(count_message_tokens(m) for m in messages)


# ── Summarizer (lightweight — no external AI call) ────────────────────────────
def _summarize_turn(msg: dict) -> str:
    """Returns a very short representation of a message for the summary buffer."""
    role    = msg.get("role", "user")
    content = msg.get("content", "").strip()
    # Truncate to first 120 chars to represent the gist
    snippet = content[:120] + ("..." if len(content) > 120 else "")
    return f"[{role.upper()}]: {snippet}"


def _build_summary_message(old_messages: list[dict]) -> dict:
    """
    Collapses a list of old messages into a single system-role summary message.
    This preserves key context without consuming full token budget.
    """
    lines   = [_summarize_turn(m) for m in old_messages]
    summary = (
        "[CONTEXT SUMMARY — earlier conversation compressed to save space]\n"
        + "\n".join(lines)
        + "\n[END SUMMARY]"
    )
    return {"role": "system", "content": summary}


# ── Core management logic ─────────────────────────────────────────────────────
def manage_context(
    messages: list[dict],
    system_prompt_tokens: int = 1200,
    context_size: int = 32768,
    reserve_tokens: int = 1500,
) -> dict:
    """
    Trims and/or compresses messages to fit within the available token budget.
    Always preserves: the most recent 6 turns (3 user + 3 assistant) minimum.
    """
    original_turns = len(messages)
    budget         = context_size - system_prompt_tokens - reserve_tokens
    # Budget floor: never go below 4096 usable tokens for history
    budget         = max(budget, 4096)

    history_tokens = count_history_tokens(messages)

    # ── Tier 1: fits fine ────────────────────────────────────────────────────
    if history_tokens <= budget:
        return {
            "status":           "ok",
            "messages":         messages,
            "was_compressed":   False,
            "original_turns":   original_turns,
            "final_turns":      len(messages),
            "tokens_used":      history_tokens + system_prompt_tokens,
            "tokens_available": context_size - history_tokens - system_prompt_tokens,
            "tiktoken_used":    TIKTOKEN_AVAILABLE,
        }

    # ── Tier 2: soft limit — summarize oldest third ───────────────────────────
    soft_limit = int(budget * 0.85)
    if history_tokens <= budget * 1.2:
        split_idx    = max(0, len(messages) // 3)
        old_messages = messages[:split_idx]
        new_messages = messages[split_idx:]

        if old_messages:
            summary_msg  = _build_summary_message(old_messages)
            compressed   = [summary_msg] + new_messages
            comp_tokens  = count_history_tokens(compressed)

            if comp_tokens <= budget:
                return {
                    "status":           "ok",
                    "messages":         compressed,
                    "was_compressed":   True,
                    "compression_tier": 2,
                    "original_turns":   original_turns,
                    "final_turns":      len(compressed),
                    "tokens_used":      comp_tokens + system_prompt_tokens,
                    "tokens_available": context_size - comp_tokens - system_prompt_tokens,
                    "tiktoken_used":    TIKTOKEN_AVAILABLE,
                }

    # ── Tier 3: hard limit — keep last N turns + one summary ─────────────────
    # Walk backwards keeping as many recent turns as fit, leaving room for summary
    SUMMARY_TOKEN_RESERVE = 200
    available_for_recent  = budget - SUMMARY_TOKEN_RESERVE
    kept_messages         = []
    tokens_kept           = 0
    MIN_KEEP_TURNS        = 6   # always keep at least last 6 messages

    for msg in reversed(messages):
        t = count_message_tokens(msg)
        if tokens_kept + t <= available_for_recent or len(kept_messages) < MIN_KEEP_TURNS:
            kept_messages.insert(0, msg)
            tokens_kept += t
        else:
            break

    dropped      = messages[:len(messages) - len(kept_messages)]
    summary_msg  = _build_summary_message(dropped) if dropped else None
    final        = ([summary_msg] + kept_messages) if summary_msg else kept_messages
    final_tokens = count_history_tokens(final)

    return {
        "status":           "ok",
        "messages":         final,
        "was_compressed":   True,
        "compression_tier": 3,
        "original_turns":   original_turns,
        "final_turns":      len(final),
        "turns_dropped":    len(dropped),
        "tokens_used":      final_tokens + system_prompt_tokens,
        "tokens_available": context_size - final_tokens - system_prompt_tokens,
        "tiktoken_used":    TIKTOKEN_AVAILABLE,
    }


# ── Flask API ─────────────────────────────────────────────────────────────────
@app.route("/tools/context", methods=["POST"])
def api_manage():
    data                 = request.get_json(force=True)
    messages             = data.get("messages", [])
    system_prompt_tokens = int(data.get("system_prompt_tokens", 1200))
    context_size         = int(data.get("context_size", 32768))
    reserve_tokens       = int(data.get("reserve_tokens", 1500))

    if not isinstance(messages, list):
        return jsonify({"status": "error", "message": "'messages' must be an array."}), 400

    result = manage_context(messages, system_prompt_tokens, context_size, reserve_tokens)
    return jsonify(result), 200


@app.route("/tools/context/count", methods=["POST"])
def api_count():
    """Quick token count endpoint — useful for debugging from server.js."""
    data     = request.get_json(force=True)
    messages = data.get("messages", [])
    text     = data.get("text", "")
    if messages:
        tokens = count_history_tokens(messages)
    else:
        tokens = count_tokens(text)
    return jsonify({"tokens": tokens, "tiktoken_used": TIKTOKEN_AVAILABLE}), 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Context Manager")
    parser.add_argument("--serve",          action="store_true")
    parser.add_argument("--port",           type=int, default=5007)
    parser.add_argument("--context-size",   type=int, default=32768)
    parser.add_argument("--system-tokens",  type=int, default=1200)
    parser.add_argument("--reserve",        type=int, default=1500)
    args = parser.parse_args()

    if args.serve:
        print(f"[ContextManager] Serving on port {args.port}")
        print(f"[ContextManager] Context size: {args.context_size} tokens")
        print(f"[ContextManager] Tiktoken available: {TIKTOKEN_AVAILABLE}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        # Self-test with a dummy conversation
        test_messages = [
            {"role": "user",      "content": "Magandang umaga! Anong programs ang meron ngayon?"},
            {"role": "assistant", "content": "Magandang umaga! May sports fest na paparating."},
            {"role": "user",      "content": "Kailan yun?"},
            {"role": "assistant", "content": "Sa Agosto 10, 2025 po."},
        ] * 5  # simulate a long conversation

        result = manage_context(
            test_messages,
            system_prompt_tokens=args.system_tokens,
            context_size=args.context_size,
            reserve_tokens=args.reserve,
        )
        print(json.dumps({k: v for k, v in result.items() if k != "messages"}, indent=2))
        print(f"Final message count: {len(result['messages'])}")
