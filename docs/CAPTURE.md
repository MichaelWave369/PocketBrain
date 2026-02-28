# Capture & Image Memory v0.5.0

PocketBrain can ingest images from camera or file upload.

## Local-first capture pipeline
1. Capture/upload image.
2. Store blob + metadata in IndexedDB.
3. Add caption/notes locally.
4. Optional bridge analysis can be triggered explicitly by user.

## Search and retrieval honesty
Image memories are only searchable by text fields:
- caption
- notes
- OCR text (when available)
- analysis summary (if generated)

Raw pixels are not treated as searchable knowledge.
