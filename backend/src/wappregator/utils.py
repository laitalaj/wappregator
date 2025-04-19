import datetime

from wappregator import model


class ScheduleFilter:
    """Filter for a list of Programs.

    This class provides methods to filter a list of Programs based on their start and
    end times, as well as the number of programs before and after the current time.
    """

    def __init__(
        self,
        start: datetime.datetime | None,
        end: datetime.datetime | None = None,
        min_previous: int | None = None,
        min_upcoming: int | None = None,
    ) -> None:
        """Initialize the filter.

        If start and/or end are provided, only programs that are active during the
        given time range are included.

        If min_previous and/or min_upcoming are provided, at least that many programs
        before and/or after the currently running program (or, if no program is
        running, the current time) are included. This includes the currently running
        program or the current time point, even if it would otherwise be excluded by the
        start and end times.

        If no filtering is done, the original list is returned.

        Args:
            start: The start time to filter by.
            end: The end time to filter by.
            min_previous: The minimum number of programs to include before the current
                time.
            min_upcoming: The minimum number of programs to include after the current
                time.
        """
        self.start = datetime.datetime.min.replace(tzinfo=datetime.UTC) if start is None else start
        self.end = datetime.datetime.max.replace(tzinfo=datetime.UTC) if end is None else end
        self.min_previous = min_previous
        self.min_upcoming = min_upcoming

    def __call__(self, schedule: list[model.Program]) -> list[model.Program]:
        """Filter a list of Programs.

        Args:
            schedule: The schedule to filter.

        Returns:
            The filtered list of Programs.
        """
        now = datetime.datetime.now().astimezone()

        start_idx = 0
        previous_idx = -1
        current_idx = None
        end_idx = 0
        for i, program in enumerate(schedule):
            if program.end < self.start:
                start_idx = i + 1
            if program.end < now:
                previous_idx = i
            if program.start <= now and now <= program.end:
                current_idx = i
            if program.start < self.end:
                end_idx = i + 1

        if self.min_previous is None and self.min_upcoming is None:
            return schedule[start_idx:end_idx]

        if self.min_previous is None:
            max_start_idx = previous_idx + 1
        else:
            max_start_idx = max(previous_idx - self.min_previous + 1, 0)

        if self.min_upcoming is None:
            min_end_idx = previous_idx + 1 if current_idx is None else current_idx + 1
        else:
            min_end_idx = (
                (previous_idx if current_idx is None else current_idx) + self.min_upcoming + 1
            )

        return schedule[min(max_start_idx, start_idx) : max(min_end_idx, end_idx)]
