import pydantic

from wapprecommon import model


class NowPlayingEvent(pydantic.BaseModel):
    """An event emitted from the poller when the currently playing song changes."""

    radio_id: str
    now_playing: model.Song | None


class StreamStatusEvent(pydantic.BaseModel):
    """An event emitted from the poller when a stream's status changes."""

    radio_id: str
    stream_status: dict[str, bool]
