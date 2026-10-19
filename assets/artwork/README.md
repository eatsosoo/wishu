# Optimized illustration assets

PNG masters are preserved. The app imports `.webp` derivatives generated with
`python scripts/optimize-illustrations.py` (Pillow with WebP support).
The script preserves transparency and full-canvas composition so the gift body/lid
retain their exact alignment. No asset is cropped.

The 12 illustrations total 690,058 bytes instead of 16,998,272 bytes (95.9% smaller).
Gift layers: 52,452 bytes combined. Jar layers: 116,366 bytes combined.
The add-wish screen preloads jar layers; the notifications screen preloads gift layers.
Both animations wait for both image loads and the motion preference before playing,
and allow an explicit retry if an image fails.

Development-only previews (no wishes/notifications are created):

- `/gift/test-preview?preview=1`: gift opening and replay.
- `/wish/new?preview=1`: star dropped into the jar.

Category covers have their own source images and optimizer documented in
[`categories/README.md`](categories/README.md).
