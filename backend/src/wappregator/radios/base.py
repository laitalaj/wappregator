from abc import ABC, abstractmethod
from typing import Any
import logging

import aiohttp
import pydantic
import valkey.asyncio as valkey
from wapprecommon import model

CACHE_TTL_SECONDS = 60 * 15
CACHE_VERSION = 5
CACHE_NAMESPACE = "radios"
CACHE_KEY_PREFIX = f"{CACHE_NAMESPACE}:{CACHE_VERSION}:"

logger = logging.getLogger(__name__)

adapter = pydantic.TypeAdapter(list[model.Program])


class RadioError(Exception):
    """Exception for errors that are due to the radio webpage misbehaving."""

    pass


class BaseFetcher(ABC):
    """Base class for fetching radio schedules."""

    def __init__(
        self,
        radio: model.Radio,
    ) -> None:
        """Initialize the fetcher.

        Args:
            radio: The Radio that this fetcher is for.
        """
        self.radio = radio

    @property
    def id(self) -> str:
        """Get the ID of the radio.

        Returns:
            The ID of the radio.
        """
        return self.radio.id

    @property
    def url(self) -> str:
        """Get the URL of the radio.

        Returns:
            The URL of the radio.
        """
        return self.radio.url

    @abstractmethod
    async def get_api_url(self, session: aiohttp.ClientSession) -> str:
        """Get the URL for the radio's API endpoint.

        Args:
            session: The aiohttp session to use for possible HTTP requests.

        Returns:
            The URL for the radio's API endpoint.
        """
        ...

    @abstractmethod
    async def parse_response(self, response: aiohttp.ClientResponse) -> Any:
        """Parse the response from the radio's API.

        Args:
            response: The response object from the aiohttp request.

        Returns:
            The parsed data from the response.
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
                return await self.parse_response(response)
            except (aiohttp.ClientResponseError, aiohttp.ContentTypeError) as e:
                raise RadioError(
                    f"Error fetching schedule from {self.radio.name}"
                ) from e

    @abstractmethod
    def parse_schedule(self, data: Any) -> list[model.Program]:
        """Parse the schedule data into a list of Program objects.

        Args:
            data: The data from the radio's API (as returned by fetch_schedule).

        Returns:
            A list of Program objects.
        """
        ...

    async def __call__(
        self, session: aiohttp.ClientSession, valkey_client: valkey.Valkey
    ) -> list[model.Program]:
        """Get the schedule in a Pydantic format.

        Args:
            session: The aiohttp session to use for HTTP requests.
            valkey_client: The Valkey client to use for caching.

        Returns:
            A list of Program objects containing the radio's schedule.
        """
        cache_key = f"{CACHE_KEY_PREFIX}{self.id}"
        cached = await valkey_client.get(cache_key)
        if cached:
            return adapter.validate_json(cached)

        data = await self.fetch_schedule(session)
        schedule = sorted(self.parse_schedule(data), key=lambda x: x.start)
        await valkey_client.set(
            cache_key, adapter.dump_json(schedule), ex=CACHE_TTL_SECONDS
        )
        return schedule


class JSONFetcher(BaseFetcher):
    """Base class for fetchers where the schedule is in JSON."""

    async def parse_response(self, response: aiohttp.ClientResponse) -> Any:
        """Parse the JSON response from the radio's API.

        Args:
            response: The response object from the aiohttp request.

        Returns:
            The parsed data from the response.
        """
        return await response.json()

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
                f"Key error parsing entry {entry} from {self.radio.name}", exc_info=True
            )
            return None
        except ValueError:
            logger.warning(
                f"Value error parsing entry {entry} from {self.radio.name}",
                exc_info=True,
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
