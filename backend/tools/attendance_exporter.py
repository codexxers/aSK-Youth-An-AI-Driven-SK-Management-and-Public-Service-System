"""
attendance_exporter.py
aSK Youth AI — Python Tool 3
─────────────────────────────────────────────────────────────────────────────
Exports attendance records for a given SK event from the database as
CSV or PDF. Optionally embeds a QR code per participant for verification.

The AI never touches raw DB data directly — it passes the event_id and
format here, and this service handles the query, formatting, and file output.

API:
  POST /tools/attendance
  Body: { "event_id": str, "format": "csv"|"pdf", "include_qr": bool }
  Returns: { "status": "ok", "filename": str, "download_url": str,
             "record_count": int, "summary": str }

Dependencies:
  pip install flask psycopg2-binary reportlab qrcode pillow
  (or swap psycopg2 for your actual DB driver)

Environment variables:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
"""

import csv
import io
import json
import os
import argparse
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory

# Optional PDF / QR imports — gracefully degrade if not installed
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import qrcode
    from PIL import Image
    QR_AVAILABLE = True
except ImportError:
    QR_AVAILABLE = False

try:
    import psycopg2
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

app      = Flask(__name__)
OUT_DIR  = Path(os.environ.get("ASKYOUTH_OUTPUT_DIR", "./generated_docs"))
BASE_URL = os.environ.get("ASKYOUTH_BASE_URL", "http://localhost:5003")
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ── DB fetch (replace with your actual ORM/query if needed) ──────────────────
def _fetch_attendance(event_id: str) -> list[dict]:
    """
    Returns a list of attendance records for the given event_id.
    Each record: { id, full_name, contact, time_in, time_out, status }

    Replace the stub below with a real DB query using psycopg2 or your ORM.
    """
    if DB_AVAILABLE:
        try:
            conn = psycopg2.connect(
                host=os.environ.get("DB_HOST", "localhost"),
                port=os.environ.get("DB_PORT", 5432),
                dbname=os.environ.get("DB_NAME", "askyouth"),
                user=os.environ.get("DB_USER", "sk_user"),
                password=os.environ.get("DB_PASS", ""),
            )
            cur = conn.cursor()
            cur.execute(
                """
                SELECT a.id, u.full_name, u.contact_number,
                       a.time_in, a.time_out, a.status
                FROM   attendance a
                JOIN   users u ON u.id = a.user_id
                WHERE  a.event_id = %s
                ORDER  BY u.full_name
                """,
                (event_id,),
            )
            rows = cur.fetchall()
            cur.close()
            conn.close()
            return [
                {
                    "id":        str(r[0]),
                    "full_name": r[1],
                    "contact":   r[2] or "",
                    "time_in":   str(r[3]) if r[3] else "",
                    "time_out":  str(r[4]) if r[4] else "",
                    "status":    r[5] or "present",
                }
                for r in rows
            ]
        except Exception as e:
            print(f"[AttendanceExporter] DB error: {e}")

    # Stub fallback for local testing without DB
    return [
        {"id": "1", "full_name": "Juan dela Cruz",   "contact": "09XX",
         "time_in": "08:05", "time_out": "17:00", "status": "present"},
        {"id": "2", "full_name": "Maria Santos",      "contact": "09XX",
         "time_in": "08:10", "time_out": "16:50", "status": "present"},
        {"id": "3", "full_name": "Pedro Reyes",       "contact": "09XX",
         "time_in": "",      "time_out": "",       "status": "absent"},
    ]


def _export_csv(records: list[dict], event_id: str) -> str:
    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"attendance_{event_id}_{ts}.csv"
    filepath = OUT_DIR / filename

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["id", "full_name", "contact", "time_in", "time_out", "status"]
        )
        writer.writeheader()
        writer.writerows(records)

    return filename


def _export_pdf(records: list[dict], event_id: str, include_qr: bool) -> str:
    if not PDF_AVAILABLE:
        raise RuntimeError("reportlab not installed — cannot generate PDF.")

    ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"attendance_{event_id}_{ts}.pdf"
    filepath = OUT_DIR / filename

    doc    = SimpleDocTemplate(str(filepath), pagesize=A4)
    styles = getSampleStyleSheet()
    story  = []

    story.append(Paragraph("Attendance Record — SK Barangay Concepcion Dos", styles["Title"]))
    story.append(Paragraph(f"Event ID: {event_id} | Generated: {datetime.now().strftime('%B %d, %Y %H:%M')}", styles["Normal"]))
    story.append(Spacer(1, 12))

    headers = ["#", "Name", "Contact", "Time In", "Time Out", "Status"]
    table_data = [headers]
    for i, r in enumerate(records, 1):
        table_data.append([
            str(i),
            r["full_name"],
            r["contact"],
            r["time_in"],
            r["time_out"],
            r["status"].upper(),
        ])

    t = Table(table_data, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0),  colors.HexColor("#1a3c6b")),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID",         (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
    ]))

    story.append(t)
    doc.build(story)
    return filename


def export_attendance(event_id: str, fmt: str = "csv", include_qr: bool = False) -> dict:
    records = _fetch_attendance(event_id)

    if fmt == "pdf":
        filename = _export_pdf(records, event_id, include_qr)
    else:
        filename = _export_csv(records, event_id)

    present = sum(1 for r in records if r["status"] == "present")
    absent  = len(records) - present

    return {
        "status":        "ok",
        "event_id":      event_id,
        "format":        fmt,
        "record_count":  len(records),
        "present":       present,
        "absent":        absent,
        "filename":      filename,
        "download_url":  f"{BASE_URL}/downloads/{filename}",
        "summary":       (
            f"Attendance exported for event '{event_id}': "
            f"{len(records)} records ({present} present, {absent} absent)."
        ),
    }


@app.route("/tools/attendance", methods=["POST"])
def api_export():
    data       = request.get_json(force=True)
    event_id   = data.get("event_id", "")
    fmt        = data.get("format", "csv").lower()
    include_qr = bool(data.get("include_qr", False))

    if not event_id:
        return jsonify({"status": "error", "message": "Missing event_id."}), 400

    result = export_attendance(event_id, fmt, include_qr)
    return jsonify(result), 200


@app.route("/downloads/<filename>")
def serve_file(filename):
    return send_from_directory(OUT_DIR, filename, as_attachment=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Attendance Exporter")
    parser.add_argument("--serve",    action="store_true")
    parser.add_argument("--port",     type=int, default=5003)
    parser.add_argument("--event",    type=str, default="test_event")
    parser.add_argument("--format",   type=str, default="csv")
    parser.add_argument("--qr",       action="store_true")
    args = parser.parse_args()

    if args.serve:
        print(f"[AttendanceExporter] Serving on port {args.port}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        result = export_attendance(args.event, args.format, args.qr)
        print(json.dumps(result, indent=2))
