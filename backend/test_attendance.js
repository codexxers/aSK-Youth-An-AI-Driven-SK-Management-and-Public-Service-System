const http = require('http');

http.get('http://localhost:3001/api/events/1/qr', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200 && data.includes('data:image/png;base64,')) {
      console.log('QR endpoint is working! Status:', res.statusCode);
    } else {
      console.log('QR endpoint failed. Status:', res.statusCode, 'Data:', data.substring(0, 100));
    }
  });
}).on('error', err => console.log('QR error:', err.message));
