from abc import ABC, abstractmethod
from typing import Any

import aiohttp

from wappregator import model


class RadioError(Exception):
    """Exception for errors that are due to the radio webpage misbehaving."""

    pass


class BaseFetcher(ABC):
    """Base class for fetching radio schedules."""

    def __init__(self, name: str, url: str) -> None:
        """Initialize the fetcher.

        Args:
            name: The name of the radio station.
            url: The (human) URL of the radio station.
        """
        self.name = name
        self.url = url

    @abstractmethod
    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: The aiohttp session to use for possible HTTP requests.

        Returns:
            The URL for the radio's API endpoint.
        """
        ...

    async def fetch_schedule(self, session: aiohttp.ClientSession) -> Any:
        """Fetch the schedule from the radio's API.

        Args:
            session: The aiohttp session to use for the HTTP request.

        Returns:
            The schedule data (JSON) from the radio's API.
        """
        async with session.get(await self.get_api_url(session)) as response:
            return await response.json()

    @abstractmethod
    def parse_schedule(self, data: Any) -> list[model.Program]:
        """Parse the schedule JSON data into a list of Program objects.

        Args:
            data: The JSON data from the radio's API (as returned by fetch_schedule).

        Returns:
            A list of Program objects.
        """
        ...

    async def __call__(self, session: aiohttp.ClientSession) -> model.Schedule:
        """Get the schedule in a Pydantic format.

        Args:
            session: The aiohttp session to use for HTTP requests.

        Returns:
            A Schedule object containing the radio's schedule.
        """
        data = await self.fetch_schedule(session)
        schedule = sorted(self.parse_schedule(data), key=lambda x: x.start)
        return model.Schedule(
            radio=model.Radio(name=self.name, url=self.url), schedule=schedule
        )
