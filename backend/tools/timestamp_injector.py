"""
timestamp_injector.py
aSK Youth AI — Python Tool 6
─────────────────────────────────────────────────────────────────────────────
Injects the current Philippine time (UTC+8) into every AI request as a
SYSTEM_TIMESTAMP runtime variable. This is called by server.js BEFORE
sending any message to the LLM, so the AI always has accurate time/date
context and never fabricates or uses bracket placeholders.

Also provides a /tools/timestamp endpoint for any frontend component
that needs the current PH time directly.

Integration (server.js):
  Before building the system prompt, call:
    const ts = await fetch('http://localhost:5006/tools/timestamp').then(r => r.json());
    const systemTimestamp = ts.iso;   // e.g. "2025-08-01T21:45:00+08:00"
  Then prepend to system prompt:
    `SYSTEM_TIMESTAMP: ${systemTimestamp}\n`

API:
  GET /tools/timestamp
  Returns: {
    "iso":        "2025-08-01T21:45:00+08:00",
    "readable":   "August 1, 2025, 9:45 PM",
    "date_only":  "August 1, 2025",
    "time_only":  "9:45 PM",
    "day":        "Friday",
    "timezone":   "Asia/Manila (UTC+8)"
  }

Dependencies:
  pip install flask pytz
"""

import argparse
import json
from datetime import datetime
from zoneinfo import ZoneInfo           # Python 3.9+
from flask import Flask, jsonify

app = Flask(__name__)

PH_TZ = ZoneInfo("Asia/Manila")


def get_ph_timestamp() -> dict:
    now = datetime.now(tz=PH_TZ)
    return {
        "iso":       now.strftime("%Y-%m-%dT%H:%M:%S+08:00"),
        "readable":  now.strftime("%B %-d, %Y, %-I:%M %p"),
        "date_only": now.strftime("%B %-d, %Y"),
        "time_only": now.strftime("%-I:%M %p"),
        "day":       now.strftime("%A"),
        "timezone":  "Asia/Manila (UTC+8)",
    }


@app.route("/tools/timestamp", methods=["GET"])
def api_timestamp():
    return jsonify(get_ph_timestamp()), 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Timestamp Injector")
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port",  type=int, default=5006)
    args = parser.parse_args()

    if args.serve:
        print(f"[TimestampInjector] Serving on port {args.port}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        print(json.dumps(get_ph_timestamp(), indent=2))
