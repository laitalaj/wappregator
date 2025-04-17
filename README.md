# Wappregator

An aggregator for Wappuradios.

## Quickstart

1. [Get `uv`](https://docs.astral.sh/uv/getting-started/)
2. `uv run fastapi dev app.py`
3. Check the minimal index at http://localhost:8000/ or the docs at http://127.0.0.1:8000/docs

**OBS:** No caching of API responses implemented yet!
Don't spam the radio web pages with requests!

## Developing

Lint with `uvx ruff format` + `uvx ruff check --fix`.
Check types with `uv run mypy src`.
