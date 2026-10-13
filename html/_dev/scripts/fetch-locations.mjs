// Lấy dữ liệu Tỉnh/Quận/Phường (dùng cho trang checkout) thành file JSON tĩnh:
//   /assets/data/provinces.json, /assets/data/districts/<provinceId>.json, /assets/data/wards/<districtId>.json
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WEB = path.resolve(ROOT, '..');
const OUT = path.join(WEB, 'assets/data');
let provinces = JSON.parse(await fs.readFile(path.join(ROOT, 'data/provinces.json'), 'utf8'));
if (typeof provinces === 'string') provinces = JSON.parse(provinces);
await fs.mkdir(path.join(OUT, 'districts'), { recursive: true });
await fs.mkdir(path.join(OUT, 'wards'), { recursive: true });
await fs.writeFile(path.join(OUT, 'provinces.json'), JSON.stringify(provinces));

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } }); if (r.ok) return await r.json(); } catch {}
    await new Promise((r) => setTimeout(r, 800));
  }
  return [];
};
const districtIds = [];
for (const p of provinces) {
  const ds = await get(`https://tahawa.com.vn/api/province/distrist?province_id=${p.id}`);
  const slim = ds.map((d) => ({ id: d.id, ghn: d.ghn_code, name: d.name }));
  await fs.writeFile(path.join(OUT, 'districts', p.id + '.json'), JSON.stringify(slim));
  districtIds.push(...slim.map((d) => d.id));
}
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < districtIds.length) {
    const id = districtIds[i++];
    const ws = await get(`https://tahawa.com.vn/api/district/ward?district_id=${id}`);
    await fs.writeFile(path.join(OUT, 'wards', id + '.json'), JSON.stringify(ws.map((w) => ({ id: w.id, ghn: w.ghn_code, name: w.name }))));
  }
}));
console.log('provinces', provinces.length, 'districts', districtIds.length);
