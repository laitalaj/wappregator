CACHE_VERSION = 1

NOWPLAYING_NAMESPACE = "nowplaying"
NOWPLAYING_PREFIX = f"{NOWPLAYING_NAMESPACE}:{CACHE_VERSION}:"

EVENTS_CHANNEL = "events"


def get_nowplaying_key(radio_id: str) -> str:
    """Get the cache key for the currently playing song.

    Args:
        radio_id: The ID of the radio station.

    Returns:
        The cache key for the currently playing song.
    """
    return f"{NOWPLAYING_PREFIX}{radio_id}"
