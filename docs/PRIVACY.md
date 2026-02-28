# Privacy

PocketBrain is designed for local-first usage:

- Chat history is stored in browser IndexedDB on-device.
- Model artifacts are fetched by WebLLM and cached in browser storage.
- Memory export/import is user controlled.
- No built-in analytics, telemetry, or remote backend in this starter.

## Important caveat

Model downloads are retrieved from external hosting used by WebLLM model distribution. If strict offline operation is required, pre-cache model assets in a controlled environment.
