const https = require('https');
const SUPABASE_URL = 'uvolvfwbzyfipzuuppqg.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2b2x2ZndienlmaXB6dXVwcHFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5Nzc1MywiZXhwIjoyMDk3MzczNzUzfQ.FXoXuCZe5h-IlvolvzMCa9Nqlolsu5Mkb2HYLSzHoAo';

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => resolve({ s: res.statusCode, b: b.substring(0, 1000) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('=== Check users table ===');
  const r1 = await apiCall('GET', '/rest/v1/users?select=*&limit=1');
  console.log('users:', r1.s, r1.b.substring(0, 300));

  console.log('=== Check modules ===');
  const r2 = await apiCall('GET', '/rest/v1/modules?select=*&limit=1');
  console.log('modules:', r2.s, r2.b.substring(0, 300));

  console.log('=== Check photos ===');
  const r3 = await apiCall('GET', '/rest/v1/photos?select=*&limit=1');
  console.log('photos:', r3.s, r3.b.substring(0, 300));
})();
