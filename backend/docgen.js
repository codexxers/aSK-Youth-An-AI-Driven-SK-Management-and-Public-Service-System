/**
 * docgen.js -- Native Node.js SK Document Generator (ESM)
 * Replaces the Python service. Uses the "docx" npm package.
 * Templates: resolution, minutes, certificate, project_brief
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } from "docx";

const SK_ORG   = "Sangguniang Kabataan";
const BARANGAY = "Barangay Concepcion Dos";
const CITY     = "Marikina City";
const REPUBLIC = "Republic of the Philippines";

function hdr() {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: REPUBLIC, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: CITY, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: BARANGAY, size: 24, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "OFFICE OF THE " + SK_ORG.toUpperCase(), size: 22, bold: true })] }),
    new Paragraph({ children: [] }),
  ];
}

function toList(v) { return Array.isArray(v) ? v : (v || "").split("\n").filter(Boolean); }

// ---- Resolution ------------------------------------------------------------
function buildResolution(d) {
  const c = [
    ...hdr(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `RESOLUTION NO. ${d.series_no||"001"}, SERIES OF ${d.year||new Date().getFullYear()}`, bold: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `"${d.title||"[Resolution Title]"}"`, size: 22 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "WHEREAS, ", bold: true, size: 22 }), new TextRun({ text: d.whereas_1||"the SK is mandated to serve the youth;", size: 22 })] }),
  ];
  if (d.whereas_2) c.push(new Paragraph({ children: [new TextRun({ text: "WHEREAS, ", bold: true, size: 22 }), new TextRun({ text: d.whereas_2, size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "NOW, THEREFORE, BE IT RESOLVED, ", bold: true, size: 22 }), new TextRun({ text: d.resolved_1||"as it is hereby resolved to approve the foregoing matter.", size: 22 })] }));
  if (d.resolved_2) c.push(new Paragraph({ children: [new TextRun({ text: "BE IT FURTHER RESOLVED, ", bold: true, size: 22 }), new TextRun({ text: d.resolved_2, size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: `APPROVED this ${d.date||"[day]"} day of ${d.month||"[month]"}, ${d.year||new Date().getFullYear()}.`, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "APPROVED UNANIMOUSLY.", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [] }), new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "________________________________", size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: d.chairperson||"[SK Chairperson]", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "SK Chairperson", size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "________________________________", size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: d.secretary||"[SK Secretary]", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "SK Secretary", size: 22 })] }));
  return new Document({ sections: [{ children: c }] });
}

// ---- Minutes ---------------------------------------------------------------
function buildMinutes(d) {
  const attendees  = toList(d.attendees);
  const agenda     = toList(d.agenda);
  const actions    = toList(d.action_items);
  const c = [
    ...hdr(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINUTES OF THE MEETING", bold: true, size: 26 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "Date    : " + (d.date||"[Date]"), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: "Time    : " + (d.time||"[Time]"), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: "Venue   : " + (d.venue||BARANGAY), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: "Presided by : " + (d.presiding_officer||"[SK Chairperson]"), size: 22 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "I. ATTENDEES", bold: true, size: 22 })] }),
    ...(attendees.length ? attendees : ["[Officer 1]"]).map(a => new Paragraph({ children: [new TextRun({ text: "    - " + a, size: 22 })] })),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "II. AGENDA", bold: true, size: 22 })] }),
    ...(agenda.length ? agenda : ["[Agenda Item 1]"]).map((item,i) => new Paragraph({ children: [new TextRun({ text: `    ${i+1}. ${item}`, size: 22 })] })),
    new Paragraph({ children: [] }),
  ];
  if (d.proceedings) {
    c.push(new Paragraph({ children: [new TextRun({ text: "III. PROCEEDINGS / DISCUSSION", bold: true, size: 22 })] }));
    c.push(new Paragraph({ children: [new TextRun({ text: "    " + d.proceedings, size: 22 })] }));
    c.push(new Paragraph({ children: [] }));
  }
  c.push(new Paragraph({ children: [new TextRun({ text: "IV. ACTION ITEMS", bold: true, size: 22 })] }));
  (actions.length ? actions : ["[Action 1]"]).forEach(a => c.push(new Paragraph({ children: [new TextRun({ text: "    - " + a, size: 22 })] })));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "V. ADJOURNMENT", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "    The meeting was adjourned at " + (d.adjournment_time||"[Time]") + ".", size: 22 })] }));
  c.push(new Paragraph({ children: [] }), new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "Prepared by:", size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: d.prepared_by||"[SK Secretary]", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "SK Secretary", size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "Noted by:", size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: d.noted_by||"[SK Chairperson]", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "SK Chairperson", size: 22 })] }));
  return new Document({ sections: [{ children: c }] });
}

// ---- Certificate -----------------------------------------------------------
function buildCertificate(d) {
  const c = [
    ...hdr(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CERTIFICATE OF RECOGNITION", bold: true, size: 28 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "This is to certify that", size: 22 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (d.recipient_name||"[Recipient Name]").toUpperCase(), bold: true, size: 28 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.purpose||"[Purpose / Recognition]", size: 22 })] }),
  ];
  if (d.details) {
    c.push(new Paragraph({ children: [] }));
    c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.details, size: 22 })] }));
  }
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Given this ${d.date||"[day]"} day of ${d.month||"[month]"}, ${d.year||new Date().getFullYear()} at ${BARANGAY}, ${CITY}.`, size: 22 })] }));
  c.push(new Paragraph({ children: [] }), new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "________________________________", size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: d.chairperson||"[SK Chairperson]", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "SK Chairperson", size: 22 })] }));
  c.push(new Paragraph({ children: [] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "________________________________", size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: d.barangay_captain||"[Barangay Captain]", bold: true, size: 22 })] }));
  c.push(new Paragraph({ children: [new TextRun({ text: "Barangay Captain", size: 22 })] }));
  return new Document({ sections: [{ children: c }] });
}

// ---- Project Brief ---------------------------------------------------------
function buildProjectBrief(d) {
  const rows = [
    ["NAME OF PROJECT/ACTIVITY",      d.project_name    || "[Project Name]"],
    ["LOCATION OF PROJECT",           d.location        || BARANGAY],
    ["TARGET DATE OF IMPLEMENTATION", d.target_date     || "[Target Date]"],
    ["BACKGROUND/RATIONALE",          d.background      || "[Background Narrative]"],
    ["OBJECTIVE",                     d.objective       || "[Objective Narrative]"],
    ["TARGET PHYSICAL OUTPUT",        d.physical_output || "[Target Physical Output]"],
    ["TARGET BENEFICIARIES",          d.beneficiaries   || "[Target Beneficiaries]"],
    ["BUDGET",                        "Php " + (d.budget || "[Amount]")],
  ];

  const tableRows = rows.map(([label, value]) => new TableRow({
    children: [
      new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22 })] })] }),
      new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value, size: 22 })] })] }),
    ],
  }));

  const c = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: REPUBLIC, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SANGGUNIANG KABATAAN", bold: true, size: 30, color: "DA291C" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: BARANGAY.toUpperCase(), bold: true, size: 28, color: "DA291C" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "City of Marikina, Metro Manila, Philippines", size: 22 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PROJECT BRIEF", bold: true, size: 24 })] }),
    new Paragraph({ children: [] }),
    new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [new TextRun({ text: "Prepared by:", size: 22 })] }),
    new Paragraph({ children: [] }),
    new Paragraph({ children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (d.prepared_by_name||"[SK Chairperson]").toUpperCase(), bold: true, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.prepared_by_title||"SK Chairperson", size: 22 })] }),
  ];
  return new Document({ sections: [{ children: c }] });
}

// ---- Dispatch --------------------------------------------------------------
const BUILDERS = { resolution: buildResolution, minutes: buildMinutes, certificate: buildCertificate, project_brief: buildProjectBrief };

export async function generateDocument(templateId, data) {
  const builder = BUILDERS[templateId];
  if (!builder) throw new Error("Unknown template: " + templateId);
  return await Packer.toBuffer(builder(data || {}));
}
