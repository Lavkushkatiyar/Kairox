from datetime import datetime, timedelta

import pytest
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


@pytest.mark.parametrize(
    ("expression", "delta"),
    [
        pytest.param("in 1 hour", timedelta(hours=1), id="one-hour-singular"),
        pytest.param("in 2 hours", timedelta(hours=2), id="multiple-hours"),
        pytest.param("in 1 minute", timedelta(minutes=1), id="one-minute-singular"),
        pytest.param("in 30 minutes", timedelta(minutes=30), id="multiple-minutes"),
        pytest.param("IN 3 HOURS", timedelta(hours=3), id="uppercase-expression"),
        pytest.param(
            "  in 15 minutes  ",
            timedelta(minutes=15),
            id="expression-with-whitespace",
        ),
    ],
)
def test_resolve_before_time_expression(
    expression: str,
    delta: timedelta,
) -> None:

    # Arrange
    reference_time = datetime(2024, 1, 15, 12, 0, 0)
    resolver = TimeResolver(
        timezone="UTC",
        reference_time=reference_time,
    )

    # Act
    result = resolver.resolve(expression)

    # Assert
    assert result == reference_time + delta

def test_before_11():
    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=datetime(2026, 4, 13, 14, 0),
    )

    result = resolver.resolve("before 11")

    assert result == datetime(2026, 4, 14, 5, 0)


def test_at_3_pm():
    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=datetime(2026, 4, 13, 14, 0),
    )

    result = resolver.resolve("at 3 pm")

    assert result == datetime(2026, 4, 13, 9, 30)
    
    
def test_fallback_parsing():
    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=datetime(2026, 4, 13, 14, 0),
    )

    result = resolver.resolve("tomorrow at 4 pm")

    assert result is not None
    assert result == datetime(2026, 4, 14, 10, 30)