import datetime
import re
import logging

import aiohttp

from bs4 import BeautifulSoup, element
from wapprecommon import model, radios

from wappregator.radios import base

DATE_RE = re.compile(r"^\d{1,2}\.\d{1,2}\.(\d{4})?$")
TIME_RE = re.compile(r"^\d{1,2}(([:.])?\d{2})?$")
SPLIT_RE = re.compile(r"[\u2013\u2014-]")  # Matches (e[nm])?dash

logger = logging.getLogger(__name__)


def parse_time(time_str: str) -> datetime.time:
    """Parse a time string.

    The string can be any of the following formats:
    - %H.%M
    - %H:%M
    - %H

    Args:
        time_str: The time string to parse.

    Returns:
        A datetime.time object representing the parsed time.
    """
    time_str = time_str.strip()
    match = TIME_RE.match(time_str)
    if match is None:
        raise ValueError(f"Could not parse time from string '{time_str}'")
    delimiter = match.group(2) if match.group(2) else ":"
    if match.group(1) is None:
        # No minutes, add :00
        time_str += f"{delimiter}00"
    return datetime.datetime.strptime(time_str, f"%H{delimiter}%M").time()


class JklFetcher(base.BaseFetcher):
    """Fetcher for Vappuradio JKL, from Jyväskylä."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(radios.JKL)

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: Not used.

        Returns:
            The URL for the radio's API endpoint.
        """
        # JKL doesn't have a proper API; we just parse stuff from the website.
        return self.url

    async def parse_response(self, response: aiohttp.ClientResponse) -> BeautifulSoup:
        """Parse the response from the radio's API.

        Args:
            response: The response to parse.

        Returns:
            A BeautifulSoup object representing the parsed HTML.
        """
        # JKL doesn't have a proper API; we just parse stuff from the website.
        return BeautifulSoup(await response.text(), "html.parser")

    def parse_schedule(self, data: BeautifulSoup) -> list[model.Program]:
        """Parse the schedule data from the response.

        Args:
            data: The parsed HTML data.

        Returns:
            A list of Program objects representing the schedule.
        """
        # Find the .container element, containing <h3>Ohjelmakartta 2025</h3>
        # There are multiple .container elements, so find the right one
        # Every day has a <h4> title (Tiistai 22.4.2025) followed by a <p>, containing
        # the programs of the day separated by <br>

        title_content = f"Ohjelmakartta {datetime.datetime.now().year}"
        headers = data.find_all("h3")
        schedule_title = next(
            (header for header in headers if header.string == title_content), None
        )
        if schedule_title is None:
            return []

        schedule_container = schedule_title.find_parent("div", class_="container")
        if schedule_container is None:
            raise base.RadioError("Could not find schedule container")
        schedule = []

        # Suomi Finland summer time is UTC+3
        timezone = datetime.timezone(datetime.timedelta(hours=3))

        last_start_time = None

        # scheduleContainer must be element.Tag
        if not isinstance(schedule_container, element.Tag):
            raise base.RadioError("Schedule container is not a Tag")

        for day in reversed(schedule_container.find_all("h4")):
            if not isinstance(day, element.Tag):
                raise base.RadioError("Day is not a Tag")

            # Get the day title
            day_title = day.string
            if day_title is None:
                raise base.RadioError("Could not find day title")

            # Get the date from the title
            # The title was in the format "Tiistai 22.4.2025" back in 2025
            # As of 2026 we seem to be doing "Ti 22.4."
            # Let's handle both cases, maybe it'll work out of the box come 2027 :^)
            # Split at the first space and parse the date
            date = None

            try:
                date_str = day_title.split(" ", 1)[1]
                match = DATE_RE.match(date_str)
                if match is None:
                    raise base.RadioError("Could not parse date from day title")
                if match.group(1) is None:
                    # Year is missing, add the current year
                    date_str += str(datetime.datetime.now().year)
                date = datetime.datetime.strptime(date_str, "%d.%m.%Y")
            except ValueError:
                raise base.RadioError("Could not parse date from day title")

            # Get the programs of the day
            # Programs are text nodes, delimited by <br> tags

            # trust me bro
            # Again let's handle both 2025 and 2026 formats
            # with fingers crossed that there's no new 2027 format
            program_p = day.find_next("p")
            if program_p is None:
                logger.warning("Could not find program container for day %s", day_title)
                continue
            program_b = program_p.find_next("b")
            programs = (program_b if program_b else program_p).find_all(string=True)

            # 2025:
            # A program looks like this: "10.00 Nopeet aamujaffat"
            # OR "12.00-13.00 VAPPURADION FINAALI"
            # Most programs don't have a time range, except for the very final one
            # For all programs expect the last one,
            # the end time is the start time of the next program
            # And programs can and do go over midnight
            # Because of this detail, we'll do a silly thing and
            # parse everything in reverse order (days were already reversed)
            # This way we can just use the start time of the next
            # (or previous, depending on how you look at it) program
            # as the end time of the current program.

            # 2026:
            # (noqa as the endashes are indeed intentional and [sic] copied from source)
            # Programs look like this: "10–12 VAPPURADION STARTTI" # noqa: RUF003
            # OR "13:30–15:30 Kuumat otot" # noqa: RUF003
            # With the possibility to have a :30 on just one end
            # Again I WILL OVERENGINEER THIS to accept both :sunglasses:
            # "because I am a madman" -Copilot

            # why the flying duck does Python enforce maximum line length
            # for comments??? while being unable to fix it???

            for program in reversed(programs):
                # Trim, and split at the first space
                stripped_program = program.strip()
                if not stripped_program:
                    continue
                parts = stripped_program.split(" ", 1)
                if len(parts) != 2:
                    raise base.RadioError("Could not parse program")

                time_str, program_title = parts

                start = None
                end = None

                # Check if the program is a time range
                if SPLIT_RE.search(time_str):
                    # This is a time range
                    # Split at the first dash
                    start_time_str, end_time_str = SPLIT_RE.split(time_str, 1)
                    # Parse the start time
                    try:
                        start_time = parse_time(start_time_str.strip())
                        end_time = parse_time(end_time_str.strip())
                    except ValueError:
                        raise base.RadioError("Could not parse time from program")
                    # Combine date and time
                    start = datetime.datetime.combine(date, start_time, timezone)
                    end = datetime.datetime.combine(date, end_time, timezone)
                    last_start_time = start
                else:
                    # This is a single time
                    # Parse the time
                    # Time is in the format HH.MM
                    time = None
                    try:
                        time = datetime.datetime.strptime(time_str, "%H.%M").time()
                    except ValueError:
                        raise base.RadioError("Could not parse time from program")
                    # Combine date and time
                    start = datetime.datetime.combine(date, time, timezone)

                    if last_start_time is None:
                        raise base.RadioError("Could not find last start time")
                    # Use the last start time as the end time
                    end = last_start_time
                    last_start_time = start
                # Create the program

                schedule.append(
                    model.Program(
                        start=start,
                        end=end,
                        title=program_title.strip(),
                        description=None,
                    )
                )

        return schedule
