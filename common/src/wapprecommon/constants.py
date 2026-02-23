import os

VALKEY_URL = os.environ["VALKEY_URL"]
INCLUDE_DEV_STATIONS = os.environ.get("INCLUDE_DEV_STATIONS", "").lower() in (
    "1",
    "true",
    "yes",
)
