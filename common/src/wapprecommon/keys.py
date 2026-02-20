CACHE_VERSION = 1

NOWPLAYING_NAMESPACE = "nowplaying"
NOWPLAYING_PREFIX = f"{NOWPLAYING_NAMESPACE}:{CACHE_VERSION}:"

BACKENDS_NAMESPACE = "backends"
BACKENDS_PREFIX = f"{BACKENDS_NAMESPACE}:{CACHE_VERSION}:"
BACKENDS_ONLINE_KEY = f"{BACKENDS_PREFIX}online"
BACKENDS_CLIENTS_PREFIX = f"{BACKENDS_PREFIX}clients:"

LISTENERS_NAMESPACE = "listeners"
LISTENERS_PREFIX = f"{LISTENERS_NAMESPACE}:{CACHE_VERSION}:"


EVENTS_CHANNEL = "events"


def get_nowplaying_key(radio_id: str) -> str:
    """Get the cache key for the currently playing song.

    Args:
        radio_id: The ID of the radio station.

    Returns:
        The cache key for the currently playing song.
    """
    return f"{NOWPLAYING_PREFIX}{radio_id}"


def get_backend_clients_key(backend_id: str) -> str:
    """Get the cache key for a backend's SocketIO session -> radio channel mapping.

    Args:
        backend_id: The ID of the backend.

    Returns:
        The cache key for the SocketIO session -> radio channel mapping.
    """
    return f"{BACKENDS_CLIENTS_PREFIX}{backend_id}"


def get_listeners_key(radio_id: str) -> str:
    """Get the cache key for the set of a radio station's listeners.

    Args:
        radio_id: The ID of the radio station.

    Returns:
        The cache key for the set of listeners of the radio station.
    """
    return f"{LISTENERS_PREFIX}{radio_id}"
