import pydantic

from wapprecommon import model


class PollerEvent(pydantic.BaseModel):
    """An event emitted from a poller."""

    radio_id: str
    now_playing: model.Song | None
