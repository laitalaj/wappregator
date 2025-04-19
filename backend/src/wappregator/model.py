import datetime

import pydantic


class Program(pydantic.BaseModel):
    """A radio program."""

    start: datetime.datetime
    end: datetime.datetime

    title: str
    description: str | None = None
    genre: str | None = None

    host: str | None = None
    producer: str | None = None

    photo: str | None = None


class Radio(pydantic.BaseModel):
    """A radio station."""

    id: str
    name: str
    url: str


class Schedule(pydantic.BaseModel):
    """The schedule of a radio station."""

    radio: Radio
    schedule: list[Program]


class NowPlaying(pydantic.BaseModel):
    """The current and next program of a radio station."""

    radio: Radio
    now_playing: Program | None = None
    up_next: Program | None = None
