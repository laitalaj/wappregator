from typing import Awaitable, overload


async def await_valkey_result[T](res: T | Awaitable[T]) -> T:
    """Await a Valkey result if it's an Awaitable, otherwise return it directly.

    The valkey-py API is a bit nicer for some commands than for others...

    Args:
        res: The result from a Valkey operation, which may be an Awaitable.

    Returns:
        The resolved result, whether it was an Awaitable or not.
    """
    if isinstance(res, Awaitable):
        return await res
    return res


@overload
def handle_valkey_str(res: str | bytes) -> str: ...


@overload
def handle_valkey_str(res: None) -> None: ...


def handle_valkey_str(res: str | bytes | None) -> str | None:
    """Handle a Valkey 'string' result.

    Looks like we're getting bytes out of the thing despite the hints saying we should
    get strings, so decode if needed.

    Args:
        res: The result from a Valkey operation, which may be a string, bytes, or None.

    Returns:
        The result as a string, or None if the input was None.
    """
    # Type checkers wanted a bunch of extra isinstance checks here
    if isinstance(res, (bytes, bytearray)):
        return res.decode()
    if isinstance(res, memoryview):
        return res.tobytes().decode()
    return res
