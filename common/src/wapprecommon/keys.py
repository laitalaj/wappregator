CACHE_VERSION = 1

NOWPLAYING_NAMESPACE = "nowplaying"
NOWPLAYING_PREFIX = f"{NOWPLAYING_NAMESPACE}:{CACHE_VERSION}:"

STREAMSTATUS_NAMESPACE = "streamstatus"
STREAMSTATUS_PREFIX = f"{STREAMSTATUS_NAMESPACE}:{CACHE_VERSION}:"

BACKENDS_NAMESPACE = "backends"
BACKENDS_PREFIX = f"{BACKENDS_NAMESPACE}:{CACHE_VERSION}:"
BACKENDS_ONLINE_KEY = f"{BACKENDS_PREFIX}online"
BACKENDS_CLIENTS_PREFIX = f"{BACKENDS_PREFIX}clients:"


NOWPLAYING_CHANNEL = "nowplaying_events"
STREAMSTATUS_CHANNEL = "streamstatus_events"


def get_nowplaying_key(radio_id: str) -> str:
    """Get the cache key for the currently playing song.

    Args:
        radio_id: The ID of the radio station.

    Returns:
        The cache key for the currently playing song.
    """
    return f"{NOWPLAYING_PREFIX}{radio_id}"


def get_streamstatus_key(radio_id: str) -> str:
    """Get the cache key for the stream status of a radio station.

    Args:
        radio_id: The ID of the radio station.

    Returns:
        The cache key for the stream status of the radio station.
    """
    return f"{STREAMSTATUS_PREFIX}{radio_id}"


def get_backend_clients_key(backend_id: str) -> str:
    """Get the cache key for a backend's SocketIO session -> radio channel mapping.

    Args:
        backend_id: The ID of the backend.

    Returns:
        The cache key for the SocketIO session -> radio channel mapping.
    """
    return f"{BACKENDS_CLIENTS_PREFIX}{backend_id}"
