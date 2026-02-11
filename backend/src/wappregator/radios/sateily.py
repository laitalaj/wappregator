import csv
import datetime
import re

import aiohttp
import bs4
from wapprecommon import model, radios

from wappregator.radios import base

TIME_RE = re.compile(r"KLO (\d{2})")
DATE_RE = re.compile(r"[A-Z]{2} (\d+)\.(\d+)")


class SateilyFetcher(base.BaseFetcher):
    """Fetcher for Radio Säteily, the wappuradio from Rovaniemi.

    Contains good ol' CSV technology.
    """

    def __init__(self) -> None:
        """Initialize the fetcher."""
        super().__init__(radios.SATEILY)
        self.link_url = "https://www.radiosateily.fi/ohjelmistocsv"

    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: The aiohttp session to use for the request.

        Returns:
            The URL for a CSV file containing the schedule.
        """
        res = await session.get(self.link_url)
        res.raise_for_status()
        soup = bs4.BeautifulSoup(await res.text(), "html.parser")
        year = datetime.date.today().year
        csv_link = soup.find("a", title=f"sateily_ohjelmakartta_vappu_{year}.csv")
        if not csv_link:
            raise base.RadioError("No CSV schedule found")

        url = csv_link.get("href")
        if not url:
            raise base.RadioError("CSV link is missing href")
        if isinstance(url, bs4.element.AttributeValueList):
            raise base.RadioError("Multiple hrefs found for CSV link")
        return url

    async def parse_response(
        self, response: aiohttp.ClientResponse
    ) -> list[dict[str, str]]:
        """Parse the response from the radio station.

        Args:
            response: The response.

        Returns:
            CSV rows as a list of dictionaries.
        """
        text = await response.text(encoding="utf-8-sig")
        reader = csv.DictReader(text.splitlines(), delimiter=";")
        return list(reader)

    def parse_schedule(self, data: list[dict[str, str]]) -> list[model.Program]:
        """Parse the schedule CSV.

        Args:
            data: The schedule data.

        Returns:
            The schedule for the radio station.
        """
        # SPAGHETTI WARNING! I just want to ship this quickly, definitely not my
        # proudest piece of code : -- D
        # TODO: Refactor the hell out of this crap
        raw: dict[str, list[model.Program]] = {}
        previous_time = 0
        extra_delta = 0
        tz = datetime.timezone(datetime.timedelta(hours=3))

        for row in data:
            time = row[""]
            time_match = TIME_RE.match(time)
            if not time_match:
                continue
            hour = int(time_match.group(1))
            if hour < previous_time:
                extra_delta += 24
            previous_time = hour
            delta = datetime.timedelta(hours=hour + extra_delta)

            for key, val in row.items():
                if key == "":
                    # Time column, handled above
                    continue
                if not val:
                    # Empty column, skip
                    continue

                date_match = DATE_RE.match(key)
                if not date_match:
                    raise base.RadioError(
                        f"Malformed header item in Säteily CSV: {key}"
                    )
                if key not in raw:
                    raw[key] = []

                day = int(date_match.group(1))
                month = int(date_match.group(2))
                while month > 12:
                    # Handle fat fingered month input
                    month -= 10

                start_date = (
                    datetime.datetime(datetime.date.today().year, month, day, tzinfo=tz)
                    + delta
                )
                end_date = start_date + datetime.timedelta(hours=1)
                raw[key].append(
                    model.Program(
                        start=start_date,
                        end=end_date,
                        title=val,
                    )
                )

        res = []
        for key, vals in raw.items():
            current = None
            for value in vals:
                if current is None:
                    current = value
                    continue
                if current.title == value.title and current.end == value.start:
                    current.end = value.end
                else:
                    res.append(current)
                    current = value
            if current is not None:
                res.append(current)
        return res
