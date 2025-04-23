from typing import Self
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


class Song(pydantic.BaseModel):
    """A song."""

    artist: str | None = None
    title: str


class Stream(pydantic.BaseModel):
    """Stream data for a radio program."""

    url: str
    mime_type: str | None = None


class Brand(pydantic.BaseModel):
    """Colors and other branding information for a radio station."""

    background_color: str
    text_color: str
    contrast_color: str | None = None

    @classmethod
    def default(cls) -> Self:
        """Get the default brand."""
        return cls(
            background_color="white",
            text_color="black",
            contrast_color="black",
        )


class Radio(pydantic.BaseModel):
    """A radio station."""

    id: str
    name: str
    url: str

    location: str
    frequency_mhz: float | None = None

    brand: Brand = Brand.default()
    streams: list[Stream] = []

    has_now_playing: bool = False
