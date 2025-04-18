from typing import Annotated
from collections.abc import AsyncIterator
import os
import pathlib
import contextlib

import fastapi
from fastapi import responses, templating
import valkey.asyncio as valkey

from wappregator import model, radios

VALKEY_URL = os.environ["VALKEY_URL"]

valkey_pool = None


@contextlib.asynccontextmanager
async def lifespan(_: fastapi.FastAPI) -> AsyncIterator[None]:
    """Manage the lifespan of the FastAPI app.

    Args:
        _: The FastAPI app instance. Not used.

    Yields:
        Nothing.
    """
    global valkey_pool
    valkey_pool = valkey.ConnectionPool.from_url(VALKEY_URL)

    try:
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
templates = templating.Jinja2Templates(
    directory=pathlib.Path(__file__).parent / "templates"
)


@app.get("/schedule")
async def get_schedule(client: ValkeyClient) -> list[model.Schedule]:
    """Get a list of Wappuradios, including full schedules."""
    return await radios.fetch_radios(client)


@app.get("/now_playing")
async def get_now_playing(client: ValkeyClient) -> list[model.NowPlaying]:
    """Get a list of Wappuradios, including current and next programs."""
    return await radios.now_playing(client)


@app.get("/")
async def index(
    request: fastapi.Request, client: ValkeyClient
) -> responses.HTMLResponse:
    """Render a nice minimal index page."""
    now_playing = await radios.now_playing(client)
    return templates.TemplateResponse(
        request=request, name="nowplaying.html", context={"now_playing": now_playing}
    )
