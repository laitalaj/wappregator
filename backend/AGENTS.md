# Backend

FastAPI server with WebSocket support (python-socketio). Serves radio station data from Valkey cache.

## Tooling

- Runtime: Python 3.13
- Package manager: `uv` (lockfile: `uv.lock`)
- Build system: Hatchling
- Linter: Ruff (rules: F, E, W, N, D, RUF)
- Type checker: mypy (`disallow_untyped_defs = true`)
- ASGI server: Uvicorn

## Dependencies

- `fastapi` - web framework
- `python-socketio` - WebSocket support
- `aiohttp` - async HTTP client
- `beautifulsoup4` - HTML parsing
- `ics` - iCalendar parsing
- `valkey` - cache client (Redis-compatible)
- `wapprecommon` - local shared library from `../common` (editable via `uv.sources`)

## Source layout

Source code is in `src/wappregator/`. Radio station implementations are in `src/wappregator/radios/`, each inheriting from a base class in `base.py`.
