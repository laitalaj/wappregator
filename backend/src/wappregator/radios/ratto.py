import re

import aiohttp
import ics
from wapprecommon import model, radios

from wappregator.radios import base, utils

HOST_RE = re.compile(r"^Toimittajat?:\s*(.+)$", re.MULTILINE)
PRODUCER_RE = re.compile(r"^Tuottajat?:\s*(.+)$", re.MULTILINE)


def _extract(re: re.Pattern, text: str) -> tuple[str, str | None]:
    match = re.search(text)
    if match is None:
        return text, None
    else:
        extracted = match.group(1).strip()
        remaining = text[: match.start()] + text[match.end() :]
        return remaining.strip(), extracted


def _extract_staff(
    description: str | None,
) -> tuple[str | None, str | None, str | None]:
    if description is None:
        return None, None, None

    description, host = _extract(HOST_RE, description)
    description, producer = _extract(PRODUCER_RE, description)

    return description, host, producer


class RattoFetcher(base.BaseFetcher):
    """Fetcher for Rattoradio, the wappuradio from Oulu.

    Why can't they have a JSON endpoint like everyone else?
    As some wise men once sang, "Oulu pilaa aina kaiken".
    """

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(radios.RATTO)
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
            description, host, producer = _extract_staff(
                utils.sanitize_value(event.description)
            )
            programs.append(
                model.Program(
                    start=event.begin.datetime,
                    end=event.end.datetime,
                    title=event.name,
                    host=host,
                    producer=producer,
                    description=description,
                )
            )
        return programs
