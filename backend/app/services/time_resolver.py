import re
from datetime import datetime, timedelta

import parsedatetime
import pytz


class TimeResolver:
    def __init__(self, timezone: str = "UTC", reference_time: datetime | None = None):

        self.tz = pytz.timezone(timezone)
        self.cal = parsedatetime.Calendar()
        if reference_time is None:
            self.reference = datetime.now(self.tz)
        elif reference_time.tzinfo is None:
            self.reference = self.tz.localize(reference_time)
        else:
            self.reference = reference_time.astimezone(self.tz)

    def resolve(self, expression: str | None) -> datetime | None:

        if not expression or not expression.strip():
            return None

        expression = expression.strip().lower()
        if expression in ("tonight", "this evening"):
            now = self.reference
            return self._to_utc(now.replace(hour=21, minute=0, second=0, microsecond=0))
        if expression in ("tomorrow", "tomorrow morning"):
            now = self.reference + timedelta(days=1)
            return self._to_utc(now.replace(hour=9, minute=0, second=0, microsecond=0))
        if match := re.fullmatch(
            r"in (\d+) (hours?|minutes?)",
            expression,
        ):
            return self._in_hours_minutes(match)

        if match := re.fullmatch(
            r"before (\d{1,2})(?::(\d{2}))?\s*(am|pm)?",
            expression,
        ):
            return self._before_time_handle(match)

        if expression in ("end of day", "eod", "by end of day"):
            target = self.reference.replace(hour=18, minute=0, second=0, microsecond=0)
            return self._to_utc(target)

        if match := re.fullmatch(
            r"(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?",
            expression,
        ):
            return self._provide_exact_time(match)

        time_struct, parse_status = self.cal.parse(expression, self.reference)

        if isinstance(parse_status, int) and parse_status > 0:
            result = datetime(*time_struct[:6])
            result = self.tz.localize(result)
            return self._to_utc(result)

    def _to_utc(self, dt: datetime) -> datetime:
        if dt.tzinfo is None:
            dt = self.tz.localize(dt)

        return dt.astimezone(pytz.UTC).replace(tzinfo=None)

    def _in_hours_minutes(self, match):
        amount = int(match.group(1))
        unit = match.group(2)

        delta = (
            timedelta(hours=amount)
            if unit.startswith("hour")
            else timedelta(minutes=amount)
        )

        return self._to_utc(self.reference + delta)

    def _before_time_handle(self, match):

        if match:
            hour = int(match.group(1))
            minute = int(match.group(2) or 0)
            period = match.group(3)

            if hour < 1 or hour > 12 or minute > 59:
                return None

            if period == "pm" and hour < 12:
                hour += 12
            elif period == "am" and hour == 12:
                hour = 0

            target = self.reference.replace(
                hour=hour, minute=minute, second=0, microsecond=0
            )

            if target <= self.reference:
                target += timedelta(days=1)

            target -= timedelta(minutes=30)

            return self._to_utc(target)

    def _provide_exact_time(self, match):

        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        period = match.group(3)

        if minute > 59:
            return None

        if period:
            if hour < 1 or hour > 12:
                return None
            if period == "pm" and hour < 12:
                hour += 12
            elif period == "am" and hour == 12:
                hour = 0
        elif hour > 23:
            return None

        target = self.reference.replace(
            hour=hour, minute=minute, second=0, microsecond=0
        )

        if target <= self.reference:
            target += timedelta(days=1)

        return self._to_utc(target)
