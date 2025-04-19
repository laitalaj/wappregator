import aiohttp
import ics

from wappregator import model
from wappregator.radios import base, utils


class RattoFetcher(base.BaseFetcher):
    """Fetcher for Rattoradio, the wappuradio from Oulu.

    Why can't they have a JSON endpoint like everyone else?
    As some wise men once sang, "Oulu pilaa aina kaiken".
    """

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id="ratto",
            name="Rattoradio",
            url="https://www.rattoradio.fi/",
            stream="https://stream.rattoradio.fi/ratto.mp3",
        )
        self.api_url = "https://www.rattoradio.fi/ohjelmisto.ics"

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: Not used.

        Returns:
            The URL for the radio's API endpoint.
        """
        return self.api_url

    async def parse_response(self, response: aiohttp.ClientResponse) -> ics.Calendar:
        """Parse the response from the radio's API.

        Args:
            response: The response object from the aiohttp request.

        Returns:
            The parsed data from the response.
        """
        txt = await response.text()
        lines = txt.splitlines()
        # Of course the ICS isn't even compatible with the standard,
        # so we do a classic lil ol puukotus here.
        fixed = "\n".join([lines[0], "PRODID:-//foobar\n", *lines[1:]])
        return ics.Calendar(fixed)

    def parse_schedule(self, data: ics.Calendar) -> list[model.Program]:
        """Parse the schedule data from the ICS file.

        Args:
            data: The ICS calendar object.

        Returns:
            A list of Program objects representing the schedule.
        """
        programs = []
        for event in data.events:
            programs.append(
                model.Program(
                    start=event.begin.datetime,
                    end=event.end.datetime,
                    title=event.name,
                    description=utils.sanitize_value(event.description),
                )
            )
        return programs
