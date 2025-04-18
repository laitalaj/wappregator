from abc import ABC, abstractmethod
from typing import Any
import logging

import aiohttp
import valkey.asyncio as valkey

from wappregator import model

CACHE_TTL_SECONDS = 60 * 60  # 1 hour

logger = logging.getLogger(__name__)


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

        Raises:
            RadioError: If there was an error fetching the schedule.
        """
        async with session.get(await self.get_api_url(session)) as response:
            try:
                response.raise_for_status()
                return await response.json()
            except (aiohttp.ClientResponseError, aiohttp.ContentTypeError) as e:
                raise RadioError(f"Error fetching schedule from {self.name}") from e

    @abstractmethod
    def parse_schedule(self, data: Any) -> list[model.Program]:
        """Parse the schedule JSON data into a list of Program objects.

        Args:
            data: The JSON data from the radio's API (as returned by fetch_schedule).

        Returns:
            A list of Program objects.
        """
        ...

    async def __call__(
        self, session: aiohttp.ClientSession, valkey_client: valkey.Valkey
    ) -> model.Schedule:
        """Get the schedule in a Pydantic format.

        Args:
            session: The aiohttp session to use for HTTP requests.
            valkey_client: The Valkey client to use for caching.

        Returns:
            A Schedule object containing the radio's schedule.
        """
        cached = await valkey_client.get(self.url)
        if cached:
            return model.Schedule.model_validate_json(cached)

        data = await self.fetch_schedule(session)
        schedule = sorted(self.parse_schedule(data), key=lambda x: x.start)
        res = model.Schedule(
            radio=model.Radio(name=self.name, url=self.url), schedule=schedule
        )
        await valkey_client.set(self.url, res.model_dump_json(), ex=CACHE_TTL_SECONDS)
        return res


class ListOfDictsFetcher(BaseFetcher):
    """Base class for fetchers where the schedule is a list of dictionaries."""

    @abstractmethod
    def parse_one(self, entry: dict[str, Any]) -> model.Program:
        """Parse a single entry from the schedule data.

        Args:
            entry: The entry to parse.

        Returns:
            A Program object representing the entry.
        """
        ...

    def handle_parse_one(self, entry: dict[str, Any]) -> model.Program | None:
        """Parse a single entry from the schedule data, and handle errors gracefully.

        This is a pre-implemented wrapper for the abstract parse_one to get rid of the
        need for error handling boilerplate.

        Args:
            entry: The entry to parse.

        Returns:
            A Program object representing the entry, or None if a handleable error
            occurred.
        """
        try:
            return self.parse_one(entry)
        except KeyError:
            logger.warning(
                f"Key error parsing entry {entry} from {self.name}", exc_info=True
            )
            return None

    def parse_schedule(self, data: list[dict[str, Any]]) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The schedule data to parse.

        Returns:
            A list of Program objects.
        """
        res = [self.handle_parse_one(entry) for entry in data]
        return [entry for entry in res if entry is not None]
