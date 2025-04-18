# Wappregator

An aggregator for Wappuradios.

## Quickstart

1. [Get `podman` and `podman-compose`](https://podman.io/)
2. `podman compose --podman-run-args="--rm" up`
3. Check the minimal index at http://localhost:8000/ or the docs at http://127.0.0.1:8000/docs

## Developing

[Use `uv`](https://docs.astral.sh/uv/getting-started/).
Lint with `uvx ruff format` + `uvx ruff check --fix`.
Check types with `uv run mypy src`.
