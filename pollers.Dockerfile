# Adapted from https://github.com/astral-sh/uv-docker-example/blob/ac09d87bf12d7b2d573a0e37c1d64f791ae31f10/multistage.Dockerfile

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
ENV UV_PYTHON_DOWNLOADS=0

ADD ./common /common

WORKDIR /app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=./pollers/uv.lock,target=uv.lock \
    --mount=type=bind,source=./pollers/pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev --no-editable

ADD ./pollers /app
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable


FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS dev

WORKDIR /app
COPY --from=builder /app /app

# TODO: Actual hot reloading
CMD ["uv", "run", "python", "-m", "wapprepollers"]


FROM python:3.13-slim-bookworm AS prod

RUN groupadd -r app && useradd -r -g app app
COPY --from=builder --chown=app:app /app/.venv /app/.venv

CMD ["/app/.venv/bin/python", "-m", "wapprepollers"]
