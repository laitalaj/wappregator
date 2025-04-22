import datetime

import aiohttp

from bs4 import BeautifulSoup, element

from wappregator import model
from wappregator.radios import base


class JklFetcher(base.BaseFetcher):
    """Fetcher for Vappuradio JKL, from Jyväskylä."""

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(
            id="jkl",
            name="Vappuradio JKL",
            url="https://www.vappuradiojkl.net",
            location="Jyväääskylä",
            brand=model.Brand(
                background_color="rgb(43, 19, 75)",
                text_color="rgb(255, 255, 255)",
            ),
            streams=[
                model.Stream(
                    url="https://jkl.hacklab.fi:8443/fm.opus",
                    mime_type="audio/ogg",
                ),
                model.Stream(
                    url="https://jkl.hacklab.fi:8443/fm.mp3",
                    mime_type="audio/mpeg",
                ),
            ],
        )

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

        schedule_title = data.find("h3", string="Ohjelmakartta 2025")
        if schedule_title is None:
            raise base.RadioError("Could not find schedule title")
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
            # The title is in the format "Tiistai 22.4.2025"
            # Split at the first space and parse the date
            date = None

            try:
                date = datetime.datetime.strptime(
                    day_title.split(" ", 1)[1], "%d.%m.%Y"
                )
            except ValueError:
                raise base.RadioError("Could not parse date from day title")

            # Get the programs of the day
            # Programs are text nodes, delimited by <br> tags

            # trust me bro
            programs = day.find_next("p").find_next("b").find_all(string=True)  # type: ignore

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

            # why the flying duck does Python enforce maximum line length
            # for comments??? while being unable to fix it???

            for program in reversed(programs):
                # Trim, and split at the first space
                program = program.strip()
                if not program:
                    continue
                parts = program.split(" ", 1)
                if len(parts) != 2:
                    raise base.RadioError("Could not parse program")

                time_str, program_title = parts

                start = None
                end = None

                # Check if the program is a time range
                if "-" in time_str:
                    # This is a time range
                    # Split at the first dash
                    start_time_str, end_time_str = time_str.split("-", 1)
                    # Parse the start time
                    try:
                        start_time = datetime.datetime.strptime(
                            start_time_str.strip(), "%H.%M"
                        ).time()
                        end_time = datetime.datetime.strptime(
                            end_time_str.strip(), "%H.%M"
                        ).time()
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
