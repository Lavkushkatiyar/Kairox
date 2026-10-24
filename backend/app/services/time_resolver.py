from datetime import datetime

import parsedatetime
import pytz


class TimeResolver:
    def __init__(self, timezone: str = "UTC", reference_time: datetime | None = None):

        self.tz = pytz.timezone(timezone)
        self.cal = parsedatetime.Calendar()
        if reference_time is None:
            self.reference = datetime.now(self.tz)
        else:
            self.reference = reference_time.astimezone(self.tz)

    def resolve(self, expression: str | None) -> datetime | None:
        if not expression or not expression.strip():
            return None

        expression = expression.strip().lower()
        if expression in ("tonight", "this evening"):
            now = self.reference
            return self._to_utc(now.replace(hour=21, minute=0, second=0, microsecond=0))

    def _to_utc(self, dt: datetime) -> datetime:
        if dt.tzinfo is None:
            dt = self.tz.localize(dt)

        return dt.astimezone(pytz.UTC).replace(tzinfo=None)
