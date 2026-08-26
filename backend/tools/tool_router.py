"""
tool_router.py
aSK Youth AI — Python Tool 7
─────────────────────────────────────────────────────────────────────────────
Central dispatcher. server.js sends every raw AI response here.
The router:
  1. Scans for a <TOOL>{ ... }</TOOL> block in the AI output
  2. Parses the JSON payload
  3. Routes to the correct Python microservice
  4. Returns the TOOL_RESULT to server.js for injection back into context

This means server.js needs only ONE integration point — the router —
instead of knowing about every individual service.

API:
  POST /route
  Body: { "raw_response": str }   ← the full AI response text
  Returns:
    If no tool found:
      { "has_tool": false, "clean_response": str }
    If tool found and executed:
      { "has_tool": true, "tool": str, "clean_response": str,
        "tool_result": { ...service response... } }
    If tool found but execution failed:
      { "has_tool": true, "tool": str, "clean_response": str,
        "tool_result": { "status": "error", "message": str } }

server.js integration:
  1. Get raw AI response
  2. POST raw_response to http://localhost:5000/route
  3. If has_tool: inject tool_result as TOOL_RESULT message into context,
     then present clean_response + formatted tool_result to user
  4. If not has_tool: present clean_response directly

Dependencies:
  pip install flask requests
"""

import re
import json
import argparse
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

# ── Service registry ──────────────────────────────────────────────────────────
# Maps tool names from AI payload to their microservice endpoints
SERVICES = {
    "document_generator": "http://localhost:5001/tools/document",
    "budget_estimator":   "http://localhost:5002/tools/budget",
    "attendance_exporter":"http://localhost:5003/tools/attendance",
    "narrative_compiler": "http://localhost:5004/tools/narrative",
    "summary_generator":  "http://localhost:5005/tools/summary",
}

TOOL_PATTERN = re.compile(r"<TOOL>\s*(\{.*?\})\s*</TOOL>", re.DOTALL)


def extract_tool_payload(raw_response: str) -> tuple[dict | None, str]:
    """
    Extracts the first <TOOL>{...}</TOOL> block from the AI response.
    Returns (payload_dict or None, cleaned_response_without_tool_block).
    """
    match = TOOL_PATTERN.search(raw_response)
    if not match:
        return None, raw_response.strip()

    json_str     = match.group(1).strip()
    clean_resp   = TOOL_PATTERN.sub("", raw_response).strip()

    try:
        payload = json.loads(json_str)
    except json.JSONDecodeError as e:
        return {"_parse_error": str(e), "_raw": json_str}, clean_resp

    return payload, clean_resp


def call_service(tool_name: str, params: dict) -> dict:
    """Dispatches to the correct microservice and returns its response."""
    endpoint = SERVICES.get(tool_name)
    if not endpoint:
        return {
            "status":  "error",
            "message": f"Unknown tool: '{tool_name}'. Available: {list(SERVICES.keys())}",
        }

    try:
        resp = requests.post(endpoint, json=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        return {
            "status":  "error",
            "message": f"Service '{tool_name}' is not reachable at {endpoint}. Is it running?",
        }
    except requests.exceptions.Timeout:
        return {
            "status":  "error",
            "message": f"Service '{tool_name}' timed out after 30 seconds.",
        }
    except Exception as e:
        return {
            "status":  "error",
            "message": f"Unexpected error calling '{tool_name}': {str(e)}",
        }


def route(raw_response: str) -> dict:
    payload, clean_response = extract_tool_payload(raw_response)

    if payload is None:
        return {
            "has_tool":       False,
            "clean_response": clean_response,
        }

    # Handle JSON parse error
    if "_parse_error" in payload:
        return {
            "has_tool":       True,
            "tool":           "unknown",
            "clean_response": clean_response,
            "tool_result": {
                "status":  "error",
                "message": f"Could not parse tool payload: {payload['_parse_error']}",
                "raw":     payload["_raw"],
            },
        }

    tool_name = payload.get("tool", "")
    params    = payload.get("params", {})

    # Remap param keys to match each service's expected body keys
    remapped = _remap_params(tool_name, params)
    result   = call_service(tool_name, remapped)

    return {
        "has_tool":       True,
        "tool":           tool_name,
        "clean_response": clean_response,
        "tool_result":    result,
    }


def _remap_params(tool_name: str, params: dict) -> dict:
    """
    Each service expects slightly different body keys.
    This normalizes the AI payload params to match each service's API.
    """
    if tool_name == "document_generator":
        return {
            "type":     params.get("type", "certificate"),
            "fields":   params.get("fields", {}),
            "language": params.get("language", "english"),
        }
    if tool_name == "budget_estimator":
        return {
            "activity_type": params.get("activity_type", "general"),
            "participants":  params.get("participants", 1),
            "include_meals": params.get("include_meals", False),
            "notes":         params.get("notes", ""),
        }
    if tool_name == "attendance_exporter":
        return {
            "event_id":   params.get("event_id", ""),
            "format":     params.get("format", "csv"),
            "include_qr": params.get("include_qr", False),
        }
    if tool_name == "narrative_compiler":
        return {
            "event_id": params.get("event_id", ""),
            "language": params.get("language", "english"),
            "tone":     params.get("tone", "formal"),
        }
    if tool_name == "summary_generator":
        return {
            "source":     params.get("source", "text"),
            "text":       params.get("text", ""),
            "rag_chunks": params.get("rag_chunks", []),
            "language":   params.get("language", "english"),
            "style":      params.get("style", "bullets"),
        }
    return params  # passthrough for unknown tools


# ── Flask API ─────────────────────────────────────────────────────────────────
@app.route("/route", methods=["POST"])
def api_route():
    data         = request.get_json(force=True)
    raw_response = data.get("raw_response", "")
    if not raw_response:
        return jsonify({"status": "error", "message": "Missing raw_response."}), 400
    return jsonify(route(raw_response)), 200


@app.route("/services", methods=["GET"])
def api_services():
    """Returns the list of registered services and their endpoints."""
    return jsonify({"services": SERVICES}), 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Tool Router")
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port",  type=int, default=5000)
    parser.add_argument("--test",  type=str, default="",
                        help="Pass a raw AI response string to test routing")
    args = parser.parse_args()

    if args.serve:
        print(f"[ToolRouter] Serving on port {args.port}")
        print(f"[ToolRouter] Registered services: {list(SERVICES.keys())}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    elif args.test:
        result = route(args.test)
        print(json.dumps(result, indent=2))
    else:
        print("Use --serve to start the server or --test '<AI response>' to test routing.")
