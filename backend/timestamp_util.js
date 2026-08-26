/**
 * timestamp_util.js
 * aSK Youth AI — Server System Clock Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the current Philippine time directly from the Node.js server's system
 * clock. No external HTTP call, no Python service, no dependency.
 * The server is on the same PC as the AI — the system clock is always accurate.
 *
 * Usage in server.js:
 *   const { getPHTimestamp, formatForPrompt } = require('./timestamp_util');
 *
 *   // Get the injection string to prepend to the system prompt:
 *   const tsLine = formatForPrompt();
 *   // → "SYSTEM_TIMESTAMP: 2025-08-01T21:45:30+08:00 (Friday, August 1 2025, 9:45 PM)\n"
 *
 *   // Or get the full object if you need individual parts:
 *   const ts = getPHTimestamp();
 *   console.log(ts.readable);   // "9:45 PM"
 *   console.log(ts.date_long);  // "Friday, August 1, 2025"
 */

'use strict';

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8 in milliseconds

/**
 * Returns the current Philippine time as a structured object.
 * @returns {{
 *   iso: string,           // "2025-08-01T21:45:30+08:00"
 *   time_readable: string, // "9:45 PM"
 *   date_long: string,     // "Friday, August 1, 2025"
 *   date_short: string,    // "August 1, 2025"
 *   day_name: string,      // "Friday"
 *   hour24: number,        // 21
 *   minute: number,        // 45
 *   full_readable: string  // "Friday, August 1, 2025, 9:45 PM"
 * }}
 */
function getPHTimestamp() {
  const now    = new Date();
  const phTime = new Date(now.getTime() + PH_OFFSET_MS);

  const year   = phTime.getUTCFullYear();
  const month  = phTime.getUTCMonth();       // 0-indexed
  const day    = phTime.getUTCDate();
  const hour24 = phTime.getUTCHours();
  const minute = phTime.getUTCMinutes();
  const second = phTime.getUTCSeconds();
  const dow    = phTime.getUTCDay();         // 0 = Sunday

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const DAYS = [
    'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday',
  ];

  const monthName  = MONTHS[month];
  const dayName    = DAYS[dow];
  const hour12     = hour24 % 12 || 12;
  const ampm       = hour24 < 12 ? 'AM' : 'PM';
  const minStr     = String(minute).padStart(2, '0');
  const secStr     = String(second).padStart(2, '0');

  // ISO 8601 with +08:00 offset
  const iso = [
    `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
    'T',
    `${String(hour24).padStart(2,'0')}:${minStr}:${secStr}`,
    '+08:00',
  ].join('');

  const time_readable = `${hour12}:${minStr} ${ampm}`;
  const date_short    = `${monthName} ${day}, ${year}`;
  const date_long     = `${dayName}, ${monthName} ${day}, ${year}`;
  const full_readable = `${date_long}, ${time_readable}`;

  return {
    iso,
    time_readable,
    date_short,
    date_long,
    day_name: dayName,
    hour24,
    minute,
    full_readable,
  };
}

/**
 * Returns the single-line SYSTEM_TIMESTAMP string to prepend to the system prompt.
 * Includes both the ISO value (for machine parsing) and human-readable form
 * (so the AI can format it naturally in responses without parsing ISO itself).
 *
 * @returns {string}
 * Example: "SYSTEM_TIMESTAMP: 2025-08-01T21:45:30+08:00 (Friday, August 1, 2025, 9:45 PM)\n"
 */
function formatForPrompt() {
  const ts = getPHTimestamp();
  return `SYSTEM_TIMESTAMP: ${ts.iso} (${ts.full_readable})\n`;
}

/**
 * Builds the complete runtime injection block to prepend to the system prompt.
 * Call this once per request, right before sending to the LLM.
 *
 * @param {string} activeRole  - "system_admin" | "chairman" | "officer" | "youth"
 * @param {boolean} pythonTools - whether Python tool services are running
 * @returns {string}
 */
function buildRuntimeInjection(activeRole = 'youth', pythonTools = true) {
  const tsLine    = formatForPrompt();
  const roleLine  = `ACTIVE_ROLE: ${activeRole}\n`;
  const toolsLine = `PYTHON_TOOLS: ${pythonTools ? 'enabled' : 'disabled'}\n`;
  return roleLine + tsLine + toolsLine;
}

module.exports = { getPHTimestamp, formatForPrompt, buildRuntimeInjection };


// ── Self-test (node timestamp_util.js) ───────────────────────────────────────
if (require.main === module) {
  const ts = getPHTimestamp();
  console.log('=== PH Timestamp from system clock ===');
  console.log('ISO:          ', ts.iso);
  console.log('Time:         ', ts.time_readable);
  console.log('Date short:   ', ts.date_short);
  console.log('Date long:    ', ts.date_long);
  console.log('Full readable:', ts.full_readable);
  console.log('');
  console.log('=== Prompt injection line ===');
  console.log(formatForPrompt());
  console.log('=== Full runtime injection block ===');
  console.log(buildRuntimeInjection('officer', true));
}
