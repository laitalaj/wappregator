import pathlib

import fastapi
from fastapi import responses, templating

from wappregator import model, radios

app = fastapi.FastAPI()
templates = templating.Jinja2Templates(
    directory=pathlib.Path(__file__).parent / "templates"
)


@app.get("/schedule")
async def get_schedule() -> list[model.Schedule]:
    """Get a list of Wappuradios, including full schedules."""
    return await radios.fetch_radios()


@app.get("/now_playing")
async def get_now_playing() -> list[model.NowPlaying]:
    """Get a list of Wappuradios, including current and next programs."""
    return await radios.now_playing()


@app.get("/")
async def index(request: fastapi.Request) -> responses.HTMLResponse:
    """Render a nice minimal index page."""
    now_playing = await radios.now_playing()
    return templates.TemplateResponse(
        request=request, name="nowplaying.html", context={"now_playing": now_playing}
    )
