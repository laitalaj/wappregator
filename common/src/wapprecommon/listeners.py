import time

import valkey.asyncio as valkey

from wapprecommon import keys, utils

NOT_LISTENING_ID = "none"


def get_backend_specific_client_id(backend_id: str, client_id: str) -> str:
    """Get a client ID that is specific to a backend.

    This is used to avoid collisions between clients of different backends.

    Args:
        backend_id: The ID of the backend.
        client_id: The original client ID.

    Returns:
        A client ID that is specific to the backend.
    """
    return f"{backend_id}:{client_id}"


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


async def add_client(
    valkey: valkey.Valkey,
    backend_id: str,
    client_id: str,
    radio_id: str = NOT_LISTENING_ID,
) -> None:
    """Add a client to the relevant data structures.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend the client is connected to.
        client_id: The ID of the client to add.
        radio_id: The ID of the radio the client is listening to.
            Use NOT_LISTENING_ID if the client isn't listening to any station.
    """
    pipe = valkey.pipeline()
    pipe.hset(keys.get_backend_clients_key(backend_id), client_id, radio_id)
    pipe.sadd(
        keys.get_listeners_key(radio_id),
        get_backend_specific_client_id(backend_id, client_id),
    )
    await pipe.execute()


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
    clients_key = keys.get_backend_clients_key(backend_id)
    backend_client_id = get_backend_specific_client_id(backend_id, client_id)

    # This might need pipe.watch to handle a case where rapid channel changes cause a
    # race condition but let's avoid the extra complexity for now, we're already
    # overengineering this
    old_radio_id = await utils.await_valkey_result(valkey.hget(clients_key, client_id))
    old_radio_id = utils.handle_valkey_str(old_radio_id)

    if old_radio_id == new_radio_id:
        return
    if old_radio_id is None:
        # This shouldn't really happen,
        # so should be fine to just burn everything in the off chance
        raise ValueError(f"Client {client_id} not found in backend {backend_id}")

    pipe = valkey.pipeline()
    pipe.smove(
        keys.get_listeners_key(old_radio_id),
        keys.get_listeners_key(new_radio_id),
        backend_client_id,
    )
    pipe.hset(clients_key, client_id, new_radio_id)
    await pipe.execute()


async def remove_client(valkey: valkey.Valkey, backend_id: str, client_id: str) -> None:
    """Remove a client from the relevant data structures.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend the client is connected to.
        client_id: The ID of the client to remove.
    """
    clients_key = keys.get_backend_clients_key(backend_id)
    backend_client_id = get_backend_specific_client_id(backend_id, client_id)
    radio_id = await utils.await_valkey_result(valkey.hget(clients_key, client_id))
    radio_id = utils.handle_valkey_str(radio_id)

    pipe = valkey.pipeline()
    if radio_id is not None:
        pipe.srem(keys.get_listeners_key(radio_id), backend_client_id)
    pipe.hdel(clients_key, client_id)
    await pipe.execute()


async def cleanup_backend(valkey: valkey.Valkey, backend_id: str) -> None:
    """Clean up a backend's listener-related data from the cache.

    This should be called when a backend goes offline to prevent stale data from
    accumulating.

    Args:
        valkey: The Valkey client to use for the operation.
        backend_id: The ID of the backend to clean up.
    """
    clients_key = keys.get_backend_clients_key(backend_id)
    clients = await utils.await_valkey_result(valkey.hgetall(clients_key))
    clients = {
        utils.handle_valkey_str(client_id): utils.handle_valkey_str(radio_id)
        for client_id, radio_id in clients.items()
    }

    pipe = valkey.pipeline()
    for client_id, radio_id in clients.items():
        backend_client_id = get_backend_specific_client_id(backend_id, client_id)
        pipe.srem(keys.get_listeners_key(radio_id), backend_client_id)
    pipe.delete(clients_key)
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
    all_ids = [*radio_ids, NOT_LISTENING_ID]
    pipe = valkey.pipeline()
    for radio_id in all_ids:
        pipe.scard(keys.get_listeners_key(radio_id))
    counts = await pipe.execute()
    return dict(zip(all_ids, counts))
