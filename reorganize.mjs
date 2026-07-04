const SB = 'https://uvolvfwbzyfipzuuppqg.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2b2x2ZndienlmaXB6dXVwcHFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5Nzc1MywiZXhwIjoyMDk3MzczNzUzfQ.FXoXuCZe5h-IlvolvzMCa9Nqlolsu5Mkb2HYLSzHoAo';
const h = { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json' };

// Step 1: Get all photos
console.log('=== Step 1: Fetching all photos ===');
const photos = await fetch(SB + '/rest/v1/photos?select=id&limit=500', { headers: h }).then(r => r.json());
console.log('Total photos:', photos.length);

// Step 2: Shuffle and pick 80
const shuffled = photos.sort(() => Math.random() - 0.5);
const selected = shuffled.slice(0, 80);
const remaining = shuffled.slice(80);
console.log('Selected for campus:', selected.length);
console.log('Remaining to delete:', remaining.length);

// Step 3: Update selected photos to campus module
console.log('\n=== Step 3: Updating 80 photos to campus module ===');
const selectedIds = selected.map(p => `"${p.id}"`).join(',');
const updateR = await fetch(SB + `/rest/v1/photos?id=in.(${selectedIds})`, {
  method: 'PATCH',
  headers: { ...h, 'Prefer': 'return=minimal' },
  body: JSON.stringify({ module_id: 'campus' })
});
console.log('Update status:', updateR.status);
const updateText = await updateR.text();
console.log('Update response:', updateText || '(empty, 204/200 means success)');

// Step 4: Delete remaining photos
console.log('\n=== Step 4: Deleting remaining photos ===');
let deleted = 0;
let failed = 0;
for (const p of remaining) {
  const r = await fetch(SB + '/rest/v1/photos?id=eq.' + p.id, { method: 'DELETE', headers: h });
  if (r.status === 204) deleted++;
  else {
    failed++;
    if (failed <= 3) console.log('Failed to delete', p.id, 'status:', r.status);
  }
}
console.log(`Deleted: ${deleted}/${remaining.length}, Failed: ${failed}`);

// Step 5: Verify final state
console.log('\n=== Step 5: Final verification ===');
const finalPhotos = await fetch(SB + '/rest/v1/photos?select=id,module_id&limit=500', { headers: h }).then(r => r.json());
const byModule = {};
finalPhotos.forEach(p => { byModule[p.module_id] = (byModule[p.module_id] || 0) + 1; });
console.log('Total photos remaining:', finalPhotos.length);
console.log('By module:', JSON.stringify(byModule));

const finalModules = await fetch(SB + '/rest/v1/modules?select=id,name,icon', { headers: h }).then(r => r.json());
console.log('Modules:', JSON.stringify(finalModules, null, 2));
