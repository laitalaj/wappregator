# Wappregator

An aggregator for Wappuradio stations. Monorepo with four components:

- `frontend/` - SolidJS SPA
- `backend/` - FastAPI server
- `pollers/` - Background polling service
- `common/` - Shared Python library (Pydantic models, constants)

## Development environment

Local development runs via Docker Compose (`compose.yml`). Services: frontend (port 3000), backend (port 8000), pollers, and Valkey cache (Redis-compatible).

## Infrastructure

- Containerized with multi-stage Dockerfiles (`backend.Dockerfile`, `pollers.Dockerfile`, `frontend/Dockerfile`)
- Deployed to UpCloud Kubernetes, managed with OpenTofu (`tofu/`)
- CI/CD via GitHub Actions, images pushed to `ghcr.io/laitalaj`

## Python components (backend, pollers, common)

- Runtime: Python 3.13 (backend), Python 3.12+ (pollers, common)
- Package manager: `uv`
- Build system: Hatchling
- `common` is referenced as a local editable dependency via `uv.sources`
- Linter: Ruff
- Type checker: mypy (strict mode, `disallow_untyped_defs = true`)

## Frontend

- Runtime: Node.js v23
- Package manager: pnpm
- Framework: SolidJS with TypeScript
- Build tool: Vite
- Formatter/linter: Biome (tab indentation, double quotes) + ESLint with eslint-plugin-solid
- Lint command: `pnpm lint` (runs `biome check --write src && eslint`)
