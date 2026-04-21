from typing import Self
from enum import StrEnum
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


def _utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class Song(pydantic.BaseModel):
    """A song."""

    artist: str | None = None
    title: str
    start: datetime.datetime = pydantic.Field(default_factory=_utc_now)

    def __eq__(self, other: object) -> bool:
        """Check if two Song objects are equal.

        Custom implementation to ignore the 'start' field and to thus avoid
        overwriting the cached value every time we poll.

        Args:
            other: The other object to compare with.

        Returns:
            True if the two objects are equal, False otherwise.
        """
        if not isinstance(other, Song):
            return False
        return self.artist == other.artist and self.title == other.title


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


class CurrentSongType(StrEnum):
    """Type of the current song information provided by a radio station."""

    NONE = "none"
    LATEST = "latest"
    REALTIME = "realtime"


class Radio(pydantic.BaseModel):
    """A radio station."""

    id: str
    name: str
    url: str

    location: str
    wappu_locations: list[str] | None = None
    frequency_mhz: float | None = None

    brand: Brand = Brand.default()
    streams: list[Stream] = []

    current_song_type: CurrentSongType = CurrentSongType.NONE
    stream_check_enabled: bool = True
