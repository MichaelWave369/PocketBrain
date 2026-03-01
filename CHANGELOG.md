# Changelog

## [0.6.0] — 2026-03-01

### Priority 1 — Bundle Optimization
- **Lazy-load page chunks**: `ChatPage`, `CapturePage`, `MemoryPage`, and `SettingsPage` are now loaded as separate Rollup chunks via `React.lazy()` + `Suspense`, cutting the initial JS parse cost significantly.
- **Deferred local WebLLM init**: The WebLLM engine no longer initialises automatically at startup. A "Load Local AI" button appears in the chat toolbar; clicking it (or sending a first message) triggers the download. Bridge providers still auto-connect immediately. This eliminates the biggest blocking task on first paint.
- **Removed eager model-list fetch**: `getCuratedModelList()` is no longer called during bootstrap. A static fallback list is shown in Settings by default. A new "Refresh model list" button in Settings lazily fetches the full list from the WebLLM registry when needed.
- **Vendor chunk splitting**: `react`/`react-dom` are bundled into a `vendor-react` chunk and `react-router-dom` into `vendor-router`, improving long-term cache hit rates.

### Priority 2 — Camera / Image Memory UI
- **Image gallery in Memory page**: The Memory page now accepts full `ImageMemory` objects and renders a responsive thumbnail grid. Tapping a thumbnail expands it inline with analysis summary, notes, capture date/source, and a delete button.
- **Memory timeline images**: Captured images from the last 7 days now appear in the Memory Timeline section with a thumbnail and description alongside chat and voice entries.
- **Image count in snapshot**: The Memory Snapshot card now shows the image memory count alongside voice notes and chat messages.
- The `MemoryPage` route in `App.tsx` now receives the full `ImageMemory[]` array (not just text snippets) and the `onDeleteImageMemory` callback.

### Priority 3 — Device Sync UX
- **Bug fix**: `SyncPanel` had `onClick={() => void applyPayload}` (function reference, never called). Fixed to `void applyPayload()`.
- **Enable Sync toggle**: A checkbox toggle controls whether the pairing/sync UI is displayed, keeping Settings clean for users who do not need sync.
- **Improved pairing flow**: `PairingQR` now shows step-by-step instructions, a **Copy Code** button (uses Clipboard API with textarea fallback), and a **Share…** button (Web Share API) for mobile.
- **Manual sync button**: A "Sync now" button triggers a manual sync attempt; `trustedDevices` is shown with last-sync timestamps.
- **Sync status badge**: `SyncStatusBadge` now uses green colouring and a `⇄` icon when at least one device is trusted, and a neutral grey `○` when offline.
- **Device ID stability**: `deviceId` is now computed and stored in a single `useMemo`, preventing repeated `localStorage.setItem` calls on every render.

### Priority 4 — TTS Integration
- **Read-aloud button**: The "🔊 Read aloud" / "⏹ Stop" button on assistant messages is now only rendered when TTS is enabled in Settings, preventing a non-functional control from cluttering the UI.
- **Auto-read** and voice-selection controls remain in the TTS section of Settings with rate/pitch/volume sliders.
- **Improved hint**: The chat textarea placeholder text changes to direct users to load the model or configure a bridge when the model is in the idle state.

### Other
- `package.json` version bumped to `0.6.0`.
- `onExportData` now embeds `appVersion: '0.6.0'` in backup archives.
- Sync status label in the header now shows device count (e.g. "1 device", "2 devices") instead of a generic "trusted" badge.
- New CSS classes: `.model-load-cta`, `.image-memory-grid`, `.image-memory-tile`, `.memory-thumb`, `.memory-image-expanded`, `.memory-image-full`, `.pairing-code-card`, `.pairing-steps`, `.pairing-payload-text`, `.sync-badge`, `.image-grid`.

## [0.5.0]

Initial release with local-first chat, voice notes, image capture, bridge mode, device pairing foundation, and TTS settings.
