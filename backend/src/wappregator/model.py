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

class Stream(pydantic.BaseModel):
    """Stream data for a radio program."""

    url: str
    mime_type: str | None = None

class Brand(pydantic.BaseModel):
    """Colors and other branding information for a radio station."""

    backgroundColor: str
    textColor: str

class Radio(pydantic.BaseModel):
    """A radio station."""

    id: str
    name: str
    url: str
    brand: Brand
    streams: list[Stream] | None = None

