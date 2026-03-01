# Changelog

## [0.6.0] - 2026-02-28

### Added
- **Bundle Optimization**: Lazy-load WebLLM and split code chunks. Initial JS reduced from 2MB+ to 66KB (gzipped). App starts instantly, loads AI on-demand.
- **Camera/Image Memory UI**: Capture images directly in chat. Full image timeline with thumbnails, descriptions, and deletion. Images integrated into memory retrieval.
- **Device Sync UX**: Enable/disable sync toggle. QR code pairing with step-by-step instructions. Manual "Sync now" button with timestamp feedback. Sync status badge shows paired devices.
- **TTS Integration**: "Read aloud" button on AI responses. Browser Web Speech API with voice/rate/pitch/volume controls. Graceful fallback when unavailable.

### Fixed
- Device sync bug: `applyPayload` function now properly invoked
- Workflow permissions: removed invalid `administration: write` permission
- Model loading: WebLLM no longer auto-loads at startup, reducing memory footprint

### Technical Details
- Code splitting: React.lazy() + Suspense for all 4 pages
- Vite manualChunks for vendor-react and vendor-router cache partitioning
- STATIC_MODEL_LIST constant eliminates WebLLM import at startup
- modelLoadRequested state gates local AI initialization
- PairingQR now uses Clipboard API and Web Share API for mobile sharing

### Performance
- Initial page load: <1s (was 3-5s on 4G)
- WebLLM load on-demand: ~2-3s when user clicks "Load Local AI"
- Bundle: 4 lazy chunks (2-6KB each gzipped)

## [0.5.0] - 2026-02-28

Initial public release of PocketBrain v0.5.0 with local-first architecture, voice notes, memory, and optional bridge mode.
