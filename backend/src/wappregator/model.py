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
    stream: str | None = None
