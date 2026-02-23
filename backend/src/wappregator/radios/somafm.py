"""Mock schedule fetcher for SomaFM dev stations."""

import datetime
import hashlib
import struct

import aiohttp
import valkey.asyncio as valkey
from wapprecommon import dev_radios, model

from wappregator.radios import base

PROGRAM_TITLES = [
    "Morning Show",
    "Midday Mix",
    "Afternoon Grooves",
    "Drive Time",
    "Evening Session",
    "Night Owl",
    "Late Night Chill",
    "After Hours",
]

VAPORWAVE_TITLES = [
    "ｍｏｒｎｉｎｇ░ｓｈｏｗ（仮）",  # noqa: RUF001
    "【ｍｉｄｄａｙ　ｍｉｘ】",  # noqa: RUF001
    "ａｆｔｅｒｎｏｏｎ　ｇｒｏｏｖｅｓ　永",  # noqa: RUF001
    "ｄｒｉｖｅ░ｔｉｍｅ（ギホ）",  # noqa: RUF001
    "【ｅｖｅｎｉｎｇ　ｓｅｓｓｉｏｎ】",  # noqa: RUF001
    "ｎｉｇｈｔ░ｏｗｌ　夜フク",  # noqa: RUF001
    "ｌａｔｅ　ｎｉｇｈｔ　ｃｈｉｌｌ　氷",  # noqa: RUF001
    "ａｆｔｅｒ░ｈｏｕｒｓ（仮ギホ）",  # noqa: RUF001
]

PROGRAM_HOSTS = [
    "DJ Test",
    "MC Debug",
    "DJ Localhost",
    None,
    None,
]


def _date_seed(date: datetime.date, radio_id: str) -> int:
    """Deterministic seed from date and radio ID.

    Makes schedules stable within a day.
    """
    h = hashlib.md5(f"{date.isoformat()}:{radio_id}".encode(), usedforsecurity=False)
    return struct.unpack("I", h.digest()[:4])[0]


def _generate_programs(
    radio_id: str,
    genre: str,
    titles: list[str],
) -> list[model.Program]:
    """Generate mock programs covering yesterday through tomorrow.

    Programs are deterministic for a given date and radio ID.
    """
    now = datetime.datetime.now(tz=datetime.timezone.utc)
    start_of_yesterday = now.replace(
        hour=0, minute=0, second=0, microsecond=0
    ) - datetime.timedelta(days=1)

    programs: list[model.Program] = []
    current = start_of_yesterday
    end_boundary = start_of_yesterday + datetime.timedelta(days=3)
    seed = _date_seed(now.date(), radio_id)
    i = 0

    while current < end_boundary:
        # Vary duration between 1 and 2 hours based on seed
        duration_minutes = 60 + ((seed + i * 37) % 61)  # 60-120 minutes
        end = current + datetime.timedelta(minutes=duration_minutes)

        title_idx = (seed + i * 13) % len(titles)
        host_idx = (seed + i * 7) % len(PROGRAM_HOSTS)

        programs.append(
            model.Program(
                start=current,
                end=end,
                title=titles[title_idx],
                genre=genre,
                host=PROGRAM_HOSTS[host_idx],
            )
        )

        current = end
        i += 1

    return programs


class SomaFMFetcher(base.BaseFetcher):
    """Mock schedule fetcher for SomaFM dev stations."""

    def __init__(
        self,
        radio: model.Radio,
        genre: str,
        titles: list[str] | None = None,
    ) -> None:
        """Initialize the fetcher.

        Args:
            radio: The Radio that this fetcher is for.
            genre: Genre string for generated programs.
            titles: Custom program titles. Defaults to PROGRAM_TITLES.
        """
        super().__init__(radio)
        self.genre = genre
        self.titles = titles or PROGRAM_TITLES

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Not used - schedule is generated locally."""
        return ""

    async def parse_response(
        self, response: aiohttp.ClientResponse
    ) -> list[model.Program]:
        """Not used - schedule is generated locally."""
        return []

    def parse_schedule(self, data: list[model.Program]) -> list[model.Program]:  # type: ignore[override]
        """Pass through - data is already a list of Programs."""
        return data

    async def __call__(
        self,
        session: aiohttp.ClientSession,
        valkey_client: valkey.Valkey,
    ) -> list[model.Program]:
        """Generate mock schedule directly, bypassing cache.

        Args:
            session: Not used.
            valkey_client: Not used.

        Returns:
            Generated mock programs.
        """
        return sorted(
            _generate_programs(self.id, self.genre, self.titles),
            key=lambda x: x.start,
        )


def get_somafm_fetchers() -> list[SomaFMFetcher]:
    """Get fetchers for all SomaFM dev stations.

    Returns:
        A list of SomaFMFetcher instances.
    """
    return [
        SomaFMFetcher(dev_radios.BOSSA, "bossa nova"),
        SomaFMFetcher(dev_radios.GROOVESALAD, "ambient"),
        SomaFMFetcher(dev_radios.DEFCON, "electronic"),
        SomaFMFetcher(
            dev_radios.VAPORWAVES, "vaporwave", VAPORWAVE_TITLES
        ),
    ]
