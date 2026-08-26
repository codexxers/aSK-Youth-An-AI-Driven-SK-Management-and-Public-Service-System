const db = require('better-sqlite3')('data/events.db');

const suggestions = [
  // Pending
  { content: 'We need more covered courts for rainy days.', status: 'pending' },
  { content: 'Can we have a programming or coding boot camp for the youth?', status: 'pending' },
  { content: 'I suggest a community pantry for school supplies.', status: 'pending' },
  { content: 'Please organize a mental health awareness seminar.', status: 'pending' },
  // Reviewed
  { content: 'Add more lights on the basketball court during night time.', status: 'reviewed', admin_response: 'We are currently procuring new LED lights.', responded_by: 'SK Chairman' },
  { content: 'Request for a youth choir or music club.', status: 'reviewed', admin_response: 'We will coordinate with local music groups for this.', responded_by: 'SK Chairman' },
  { content: 'Can we install free Wi-Fi spots at the barangay plaza?', status: 'reviewed', admin_response: 'Budget is being reviewed for a barangay-wide hotspot.', responded_by: 'System Administrator' },
  { content: 'Organize a job fair specifically for fresh graduates.', status: 'reviewed', admin_response: 'Planning this for next quarter in coordination with PESO.', responded_by: 'SK Officer' },
  // Resolved
  { content: 'The rims on the half-court are broken.', status: 'resolved', admin_response: 'Rims have been replaced as of May 1st.', responded_by: 'SK Chairman' },
  { content: 'Please distribute relief goods for the affected youth during the recent typhoon.', status: 'resolved', admin_response: 'Relief distribution was successfully completed last week.', responded_by: 'SK Officer' },
  { content: 'Can we have an e-sports tournament?', status: 'resolved', admin_response: 'We hosted the MLBB tournament last month!', responded_by: 'System Administrator' },
  { content: 'We need trash bins around the park area.', status: 'resolved', admin_response: 'New segregated trash bins were installed yesterday.', responded_by: 'SK Chairman' }
];

const insert = db.prepare('INSERT INTO suggestions (content, category, submitter_name, submitter_role, status, admin_response, responded_by) VALUES (?, ?, ?, ?, ?, ?, ?)');

for (const s of suggestions) {
  insert.run(s.content, 'general', 'Youth Member', 'youth', s.status, s.admin_response || null, s.responded_by || null);
}

console.log('Seeded suggestions');
