from datetime import datetime

import pytz

from app.services.time_resolver import TimeResolver


def test_tonight_with_naive_reference():
    reference = datetime(2026, 4, 13, 14, 0)

    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=reference,
    )

    result = resolver.resolve("tonight")

    assert result == datetime(2026, 4, 13, 15, 30)


def test_tonight_with_utc_reference():
    reference = pytz.UTC.localize(datetime(2026, 4, 13, 8, 30))

    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=reference,
    )

    result = resolver.resolve("tonight")

    assert result == datetime(2026, 4, 13, 15, 30)


def test_tonight_with_different_system_timezone_assumption():
    india_timezone = pytz.timezone("Asia/Kolkata")
    reference = india_timezone.localize(datetime(2026, 4, 13, 14, 0))

    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=reference,
    )

    result = resolver.resolve("tonight")

    assert result == datetime(2026, 4, 13, 15, 30)


def test_tomorrow_time():
    india_timezone = pytz.timezone("Asia/Kolkata")
    reference = india_timezone.localize(datetime(2026, 4, 13, 14, 0))

    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=reference,
    )

    result = resolver.resolve("tomorrow")

    assert result == datetime(2026, 4, 14, 3, 30)
