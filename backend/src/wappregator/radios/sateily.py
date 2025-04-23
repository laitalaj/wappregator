import datetime

import aiohttp
from wapprecommon import model, radios

from wappregator.radios import base


class SateilyFetcher(base.BaseFetcher):
    """Fetcher for Radio Säteily, the wappuradio from Rovaniemi.

    If you thought Rattoradio was bad, check this out.
    """

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(radios.SATEILY)

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        No API available.

        Just a set of Excel screenshots.

        Args:
            session: Not used.

        Returns:
            An empty string.
        """
        return ""

    async def fetch_schedule(
        self, session: aiohttp.ClientSession
    ) -> list[model.Program]:
        """Return a mysterious schedule.

        Args:
            session: Not used.

        Returns:
            The schedule for the radio station.
        """
        programs = []
        start_date = datetime.date(2025, 4, 16)
        end_date = datetime.date(2025, 4, 30)
        current_date = start_date
        tz = datetime.timezone(datetime.timedelta(hours=3))

        while current_date <= end_date:
            start_time = datetime.datetime.combine(
                current_date, datetime.time.min, tzinfo=tz
            )
            end_time = datetime.datetime.combine(
                current_date, datetime.time.max, tzinfo=tz
            )
            programs.append(
                model.Program(
                    title="???",
                    description="Selvitä mysteeri Excelistä: https://www.radiosateily.fi/ohjelmakartta",
                    start=start_time,
                    end=end_time,
                )
            )
            current_date += datetime.timedelta(days=1)

        return programs

    async def parse_response(self, response: aiohttp.ClientResponse) -> None:
        """Parse the response from the radio station.

        Never called. No responses to parse.

        I mean I love the asethetics of the site, though.
        So who cares if some poor old programmer can't access the schedule
        programmatically?
        Style over substance!

        Args:
            response: Not used.
        """
        pass

    def parse_schedule(self, data: list[model.Program]) -> list[model.Program]:
        """Return the schedule as is.

        Identity is beautiful.

        Amen.

        Args:
            data: The schedule data.

        Returns:
            The schedule for the radio station.
        """
        return data
