from datetime import datetime

from app.services.time_resolver import TimeResolver


def test_tonight():
    reference = datetime(2026, 4, 13, 14, 0)
    resolver = TimeResolver(
        timezone="Asia/Kolkata",
        reference_time=reference,
    )

    result = resolver.resolve("tonight")

    assert result == datetime(2026, 4, 13, 15, 30)
