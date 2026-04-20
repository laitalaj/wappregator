import time
from collections import Counter

import valkey.asyncio as valkey

from wapprecommon import keys, utils

NOT_LISTENING_ID = "none"


async def backend_heartbeat(valkey: valkey.Valkey, backend_id: str) -> None:
    """Update a backend's heartbeat timestamp.

    This should be called periodically by backends to indicate that they are still
    online.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend sending the heartbeat.
    """
    now = str(int(time.time()))
    await utils.await_valkey_result(
        valkey.hset(keys.BACKENDS_ONLINE_KEY, backend_id, now)
    )


async def get_backend_heartbeats(valkey: valkey.Valkey) -> dict[str, int]:
    """Get the heartbeat timestamps for all backends.

    Args:
        valkey: The Valkey client to use for the operation.

    Returns:
        A dictionary mapping backend IDs to their last heartbeat timestamps.
    """
    heartbeats = await utils.await_valkey_result(
        valkey.hgetall(keys.BACKENDS_ONLINE_KEY)
    )
    return {
        utils.handle_valkey_str(backend_id): int(hb)
        for backend_id, hb in heartbeats.items()
    }


async def add_backend(valkey: valkey.Valkey, backend_id: str) -> None:
    """Add a backend to the list of online backends.

    Currently just sets the hearbeat, but keeping it here in case we want to do more
    in the future.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend to add.
    """
    await backend_heartbeat(valkey, backend_id)


async def change_channel(
    valkey: valkey.Valkey, backend_id: str, client_id: str, new_radio_id: str
) -> None:
    """Change the radio station a client is listening to.

    Use NOT_LISTENING_ID as the new_radio_id if the client has stopped listening to any
    station.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend the client is connected to.
        client_id: The ID of the client changing channels.
        new_radio_id: The ID of the new radio station the client is listening to.
    """
    await utils.await_valkey_result(
        valkey.hset(keys.get_backend_clients_key(backend_id), client_id, new_radio_id)
    )


async def remove_client(valkey: valkey.Valkey, backend_id: str, client_id: str) -> None:
    """Remove a client from the relevant data structures.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend the client is connected to.
        client_id: The ID of the client to remove.
    """
    await utils.await_valkey_result(
        valkey.hdel(keys.get_backend_clients_key(backend_id), client_id)
    )


async def cleanup_backend(valkey: valkey.Valkey, backend_id: str) -> None:
    """Clean up a backend's listener-related data from the cache.

    This should be called when a backend goes offline to prevent stale data from
    accumulating.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend to clean up.
    """
    pipe = valkey.pipeline()
    pipe.delete(keys.get_backend_clients_key(backend_id))
    pipe.hdel(keys.BACKENDS_ONLINE_KEY, backend_id)
    await pipe.execute()


async def get_listener_counts(
    valkey: valkey.Valkey, radio_ids: list[str]
) -> dict[str, int]:
    """Get the number of listeners for each radio station.

    Args:
        valkey: The Valkey client to use for the operation.
        radio_ids: A list of radio station IDs to get listener counts for.

    Returns:
        A dictionary mapping radio station IDs to their listener counts.
        Has an additional entry with key NOT_LISTENING_ID for clients that aren't
        listening to any station.
    """
    backends = await utils.await_valkey_result(valkey.hkeys(keys.BACKENDS_ONLINE_KEY))
    pipe = valkey.pipeline()
    for backend_id in backends:
        pipe.hgetall(keys.get_backend_clients_key(utils.handle_valkey_str(backend_id)))
    backend_clients: list[dict[str, str]] = await pipe.execute()

    counts = Counter(
        utils.handle_valkey_str(radio_id)
        for clients in backend_clients
        for radio_id in clients.values()
    )
    all_ids = [*radio_ids, NOT_LISTENING_ID]
    all_counts = {radio_id: counts.get(radio_id, 0) for radio_id in all_ids}
    return all_counts
