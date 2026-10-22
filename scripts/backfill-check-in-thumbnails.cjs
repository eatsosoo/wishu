// Creates private derivatives only; never overwrites originals or changes rows.
// WISHU_IMAGE_PYTHON must point to a Python runtime with Pillow installed.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { privateCheckInPath, checkInThumbnailPath } = require('../src/features/check-in/privacy.ts');
const cli = args => execFileSync('npx', ['--yes', 'supabase', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let stage = 'manifest';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'wishu-thumbnails-'));
try {
  const response = JSON.parse(cli(['db', 'query', '--linked', "select distinct c.couple_id::text as space, c.photo->>'storagePath' as path, exists(select 1 from storage.objects o where o.bucket_id='wish-photos' and o.name=(c.photo->>'storagePath') || '.thumb-144.jpg') as ready from (select couple_id, photo from public.check_ins union all select couple_id, photo from public.memory_photos union all select couple_id, cover as photo from public.wishes) c where c.photo->>'storagePath' is not null order by path"]));
  const rows = response.rows;
  if (!Array.isArray(rows)) throw new Error('Invalid backfill manifest');
  let originalBytes = 0, thumbnailBytes = 0, count = 0, existing = 0;
  for (const row of rows) {
    if (privateCheckInPath({ uri: `storage://${row.path}`, storagePath: row.path }, row.space) !== row.path) throw new Error('Invalid private object path');
    if (row.ready) { existing++; continue; }
    const source = path.join(work, 'original');
    const target = path.join(work, 'thumbnail.jpg');
    stage = 'download';
    cli(['storage', 'cp', `ss:///wish-photos/${row.path}`, source, '--linked', '--experimental']);
    stage = 'resize';
    execFileSync(process.env.WISHU_IMAGE_PYTHON || 'python3', ['-c', [
      'from PIL import Image, ImageOps', 'import sys',
      'with Image.open(sys.argv[1]) as source:',
      ' image = ImageOps.exif_transpose(source).convert("RGB")',
      ' image = ImageOps.fit(image, (144, 144), method=Image.Resampling.LANCZOS)',
      ' image.save(sys.argv[2], "JPEG", quality=72, optimize=True, progressive=True)',
      'with Image.open(sys.argv[2]) as check: assert check.size == (144, 144)',
    ].join('\n'), source, target], { stdio: ['ignore', 'pipe', 'pipe'] });
    stage = 'upload';
    cli(['storage', 'cp', target, `ss:///wish-photos/${checkInThumbnailPath(row.path)}`, '--linked', '--experimental', '--content-type', 'image/jpeg', '--cache-control', 'max-age=0, no-store']);
    originalBytes += fs.statSync(source).size; thumbnailBytes += fs.statSync(target).size; count++;
  }
  console.log(JSON.stringify({ thumbnails: count + existing, created: count, existing, dimensions: '144x144', originalBytes, thumbnailBytes }));
} catch (error) {
  console.error(`Thumbnail backfill failed at ${stage} (${error.status ?? error.message}). No originals were changed.`);
  if (error.stderr || error.stdout) console.error(String(error.stderr || error.stdout).replace(/https?:\/\/\S+|ss:\/\/\/\S+/g, '[url]').replace(/[a-f\d]{8}-[a-f\d-]{27}/gi, '[id]').slice(-1400));
  process.exitCode = 1;
} finally { fs.rmSync(work, { recursive: true, force: true }); }
