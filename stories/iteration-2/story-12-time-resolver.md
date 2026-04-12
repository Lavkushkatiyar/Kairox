# Story 12: Time Reference Resolution Engine

| Field | Details |
|-------|---------|
| **Iteration** | 2 — Intelligence |
| **Story #** | 12 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 11 (Processing Pipeline) |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** user,  
**I want** the system to correctly understand "tomorrow", "tonight", "before 11",  
**So that** my tasks have accurate deadlines and scheduling.

---

## Description

When AI extracts time references from natural language, they come as strings like "tomorrow 11am", "tonight", "before the meeting". This engine converts those strings into precise UTC datetimes, respecting the user's timezone.

---

## Backend Tasks

### 12.1 — Install Dependencies

```
pip install python-dateutil parsedatetime pytz
```

### 12.2 — Time Resolver Service (`services/time_resolver.py`)

```python
import parsedatetime
from datetime import datetime, timedelta
from dateutil import parser as dateutil_parser
import pytz

class TimeResolver:
    def __init__(self, timezone: str = "UTC", reference_time: datetime = None):
        self.tz = pytz.timezone(timezone)
        self.reference = reference_time or datetime.now(self.tz)
        self.cal = parsedatetime.Calendar()

    def resolve(self, expression: str) -> datetime | None:
        if not expression:
            return None
        
        expression = expression.strip().lower()
        
        # Try custom patterns first
        result = self._try_custom_patterns(expression)
        if result:
            return self._to_utc(result)
        
        # Try parsedatetime library
        result = self._try_parsedatetime(expression)
        if result:
            return self._to_utc(result)
        
        # Try dateutil as fallback
        result = self._try_dateutil(expression)
        if result:
            return self._to_utc(result)
        
        return None

    def _try_custom_patterns(self, expr: str) -> datetime | None:
        now = self.reference
        
        # "tonight" → same day 9:00 PM
        if expr in ("tonight", "this evening"):
            return now.replace(hour=21, minute=0, second=0, microsecond=0)
        
        # "tomorrow" → next day 9:00 AM
        if expr == "tomorrow":
            return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0)
        
        # "tomorrow morning" → next day 9:00 AM
        if expr == "tomorrow morning":
            return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0)
        
        # "tomorrow evening" → next day 6:00 PM
        if expr == "tomorrow evening":
            return (now + timedelta(days=1)).replace(hour=18, minute=0, second=0)
        
        # "end of day" / "eod" → today 6:00 PM
        if expr in ("end of day", "eod", "by end of day"):
            return now.replace(hour=18, minute=0, second=0)
        
        # "this weekend" → next Saturday 10:00 AM
        if expr in ("this weekend", "weekend"):
            days_until_sat = (5 - now.weekday()) % 7
            if days_until_sat == 0: days_until_sat = 7
            return (now + timedelta(days=days_until_sat)).replace(hour=10, minute=0, second=0)
        
        # "next week" → next Monday 9:00 AM
        if expr == "next week":
            days_until_mon = (7 - now.weekday()) % 7
            if days_until_mon == 0: days_until_mon = 7
            return (now + timedelta(days=days_until_mon)).replace(hour=9, minute=0, second=0)
        
        # "in N hours/minutes"
        import re
        match = re.match(r"in (\d+) (hour|hours|hr|hrs)", expr)
        if match:
            return now + timedelta(hours=int(match.group(1)))
        match = re.match(r"in (\d+) (minute|minutes|min|mins)", expr)
        if match:
            return now + timedelta(minutes=int(match.group(1)))
        
        # "before N" or "before N am/pm"
        match = re.match(r"before (\d{1,2})(?::(\d{2}))?\s*(am|pm)?", expr)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2) or 0)
            period = match.group(3)
            if period == "pm" and hour < 12: hour += 12
            if period == "am" and hour == 12: hour = 0
            target = now.replace(hour=hour, minute=minute, second=0)
            if target <= now:
                target += timedelta(days=1)
            # Subtract 30 min buffer for "before"
            return target - timedelta(minutes=30)
        
        # "at N" or "at N am/pm"
        match = re.match(r"(?:at |@)(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", expr)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2) or 0)
            period = match.group(3)
            if period == "pm" and hour < 12: hour += 12
            if period == "am" and hour == 12: hour = 0
            target = now.replace(hour=hour, minute=minute, second=0)
            if target <= now:
                target += timedelta(days=1)
            return target
        
        return None

    def _try_parsedatetime(self, expr: str) -> datetime | None:
        time_struct, parse_status = self.cal.parse(expr, self.reference)
        if parse_status > 0:
            return datetime(*time_struct[:6], tzinfo=self.tz)
        return None

    def _try_dateutil(self, expr: str) -> datetime | None:
        try:
            result = dateutil_parser.parse(expr, fuzzy=True, default=self.reference)
            if result.tzinfo is None:
                result = self.tz.localize(result)
            return result
        except (ValueError, OverflowError):
            return None

    def _to_utc(self, dt: datetime) -> datetime:
        if dt.tzinfo is None:
            dt = self.tz.localize(dt)
        return dt.astimezone(pytz.UTC).replace(tzinfo=None)
```

### 12.3 — Add User Timezone

Update User model (migration):
```python
# Already added in Story 2: timezone = Column(String(50), default="UTC")
```

### 12.4 — Unit Tests (`tests/test_time_resolver.py`)

```python
import pytest
from datetime import datetime
from app.services.time_resolver import TimeResolver

@pytest.fixture
def resolver():
    ref = datetime(2026, 4, 13, 14, 0, 0)  # Monday 2PM
    return TimeResolver(timezone="Asia/Kolkata", reference_time=ref)

class TestTimeResolver:
    def test_tonight(self, resolver):
        result = resolver.resolve("tonight")
        assert result.hour == 15  # 9PM IST = 3:30PM UTC (roughly)

    def test_tomorrow(self, resolver):
        result = resolver.resolve("tomorrow")
        assert result is not None

    def test_before_11(self, resolver):
        result = resolver.resolve("before 11")
        assert result is not None

    def test_in_2_hours(self, resolver):
        result = resolver.resolve("in 2 hours")
        assert result is not None

    def test_end_of_day(self, resolver):
        result = resolver.resolve("end of day")
        assert result is not None

    def test_this_weekend(self, resolver):
        result = resolver.resolve("this weekend")
        assert result.weekday() == 5  # Saturday

    def test_next_week(self, resolver):
        result = resolver.resolve("next week")
        assert result.weekday() == 0  # Monday

    def test_at_3pm(self, resolver):
        result = resolver.resolve("at 3 pm")
        assert result is not None

    def test_invalid(self, resolver):
        result = resolver.resolve("asdfgh")
        assert result is None

    def test_empty(self, resolver):
        result = resolver.resolve("")
        assert result is None
    
    # ... extend to 15+ test cases
```

---

## Frontend Tasks

### 12.5 — Display Resolved Times

Show both absolute and relative time on task cards:
- **Absolute**: "Apr 14, 2026 at 11:00 AM"
- **Relative**: "(in 18 hours)" or "(2 days ago)"
- **Overdue**: Red text with "Overdue by 3 hours"

### 12.6 — Time Override

Allow users to edit the resolved time if AI got it wrong:
- Click on the time in Task Detail → opens date/time picker
- Shows original AI expression vs resolved time for comparison

---

## Acceptance Criteria

- [ ] "tonight" resolves to today 9:00 PM user time
- [ ] "tomorrow" resolves to next day 9:00 AM user time
- [ ] "before 11" resolves to 10:30 AM (with buffer)
- [ ] "in 2 hours" resolves to now + 2 hours
- [ ] "this weekend" resolves to next Saturday
- [ ] "end of day" resolves to today 6:00 PM
- [ ] User timezone is respected in all conversions
- [ ] Invalid expressions return None (not crash)
- [ ] At least 15 unit test cases pass
- [ ] Frontend shows absolute + relative times

---

## Notes

- `parsedatetime` handles most natural language; custom patterns handle the edge cases.
- All datetimes stored in DB are UTC; conversion to user TZ happens at display time.
- The "before X" pattern subtracts a 30-minute buffer — configurable.
