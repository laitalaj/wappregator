from typing import Annotated, Callable
from collections.abc import AsyncIterator
import datetime
import os
import contextlib
import logging

import fastapi
from fastapi.middleware import cors
import socketio
import valkey.asyncio as valkey
from wapprecommon import model
from wapprecommon.constants import VALKEY_URL

from wappregator import socket, radios, utils
from wappregator.radios.base import CACHE_TTL_SECONDS

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS")
ALLOWED_ORIGINS_LIST = ALLOWED_ORIGINS.split(",") if ALLOWED_ORIGINS else []

logger = logging.getLogger(__name__)

valkey_pool = None


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=ALLOWED_ORIGINS_LIST)


@contextlib.asynccontextmanager
async def lifespan(_: fastapi.FastAPI) -> AsyncIterator[None]:
    """Manage the lifespan of the FastAPI app.

    Args:
        _: The FastAPI app instance. Not used.

    Yields:
        Nothing.
    """
    logging.basicConfig(level=logging.INFO)

    global valkey_pool
    valkey_pool = valkey.ConnectionPool.from_url(VALKEY_URL)

    try:
        async with socket.setup_socketio(sio, valkey_pool):
            yield
    finally:
        await valkey_pool.aclose()


async def valkey_client() -> AsyncIterator[valkey.Valkey]:
    """Create a Valkey client.

    Made to be used as a dependency in FastAPI routes.

    Yields:
        A Valkey client instance.
    """
    client = valkey.Valkey(connection_pool=valkey_pool)
    try:
        yield client
    finally:
        await client.aclose()


ValkeyClient = Annotated[valkey.Valkey, fastapi.Depends(valkey_client)]

app = fastapi.FastAPI(lifespan=lifespan)

if ALLOWED_ORIGINS_LIST:
    app.add_middleware(
        cors.CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS_LIST,
    )

wrapped_app = socketio.ASGIApp(sio, app)


def cacheable(ttl: int) -> Callable[[fastapi.Response], None]:
    """Generate a dependency that sets cache control headers for a response.

    Args:
        ttl: Cache max age in seconds.
    """

    def dep(response: fastapi.Response) -> None:
        response.headers["Cache-Control"] = f"public, max-age={ttl}"

    return dep


@app.get("/radios", dependencies=[fastapi.Depends(cacheable(60 * 60))])
async def get_radios() -> dict[str, model.Radio]:
    """Get available Wappuradios."""
    return radios.radios()


@app.get("/schedule", dependencies=[fastapi.Depends(cacheable(CACHE_TTL_SECONDS))])
async def get_schedule(
    client: ValkeyClient,
    include: Annotated[list[str] | None, fastapi.Query()] = None,
    start: datetime.datetime | None = None,
    end: datetime.datetime | None = None,
    min_previous: int | None = None,
    min_upcoming: int | None = None,
) -> dict[str, list[model.Program]]:
    """Get schedules for Wappuradios."""
    schedule = await radios.schedule(client)
    filt = utils.ScheduleFilter(
        start=start,
        end=end,
        min_previous=min_previous,
        min_upcoming=min_upcoming,
    )
    return {k: filt(v) for k, v in schedule.items() if include is None or k in include}


@app.get("/offseason", dependencies=[fastapi.Depends(cacheable(CACHE_TTL_SECONDS))])
async def get_offseason(client: ValkeyClient) -> bool:
    """Check whether we are in off-season."""
    schedule = await radios.schedule(client)
    start = datetime.datetime.now(utils.DEFAULT_TZ)
    end = datetime.datetime(start.year, 5, 2, tzinfo=utils.DEFAULT_TZ)
    if start >= end:
        return True

    filt = utils.ScheduleFilter(start=start, end=end)
    return all(len(filt(programs)) == 0 for programs in schedule.values())


@app.get("/now_playing")
async def get_now_playing(client: ValkeyClient) -> dict[str, model.Song | None]:
    """Get currently playing songs for Wappuradios."""
    return await radios.now_playing(client)


@app.get("/health/live")
async def live_check() -> str:
    """Check whether the app is alive."""
    return "ok"


@app.get("/health/ready")
async def ready_check(client: ValkeyClient) -> str:
    """Check whether the app is ready."""
    await client.ping()
    return "ok"
