"""
Historical backfill task.

When an athlete first connects a provider (e.g. WHOOP), this task automatically
fetches all their historical data going back up to 3 years, month by month.

Each month is queued as a separate sync task with a 15-second delay between them,
keeping us comfortably under WHOOP's 100 requests/minute rate limit.
"""

from calendar import monthrange
from datetime import datetime, timezone
from logging import getLogger

from celery import shared_task

from app.utils.structured_logging import log_structured

logger = getLogger(__name__)

# How many years back to go when backfilling
BACKFILL_YEARS = 3

# Seconds between each monthly sync task (15s = ~4 months/min = ~24 API calls/min)
DELAY_BETWEEN_MONTHS_SECONDS = 15


def _generate_months(years_back: int) -> list[tuple[str, str]]:
    """
    Generate a list of (start_date, end_date) pairs, one per month,
    going from `years_back` years ago up to today.

    Returns ISO 8601 strings like "2024-01-01T00:00:00" / "2024-01-31T23:59:59".
    """
    now = datetime.now(timezone.utc)
    months = []

    # Start from the first day of the month, years_back years ago
    start_year = now.year - years_back
    start_month = now.month

    current_year = start_year
    current_month = start_month

    while (current_year, current_month) <= (now.year, now.month):
        # First day of this month
        month_start = datetime(current_year, current_month, 1, 0, 0, 0, tzinfo=timezone.utc)

        # Last day of this month
        last_day = monthrange(current_year, current_month)[1]
        month_end = datetime(current_year, current_month, last_day, 23, 59, 59, tzinfo=timezone.utc)

        # Don't go past today
        if month_end > now:
            month_end = now

        months.append((month_start.isoformat(), month_end.isoformat()))

        # Advance to next month
        if current_month == 12:
            current_month = 1
            current_year += 1
        else:
            current_month += 1

    return months


@shared_task
def historical_backfill(user_id: str, provider: str = "whoop") -> dict:
    """
    Queue monthly sync tasks for all historical data going back BACKFILL_YEARS years.

    This task itself just schedules the work — the actual API calls happen in
    individual sync_vendor_data tasks, each delayed by DELAY_BETWEEN_MONTHS_SECONDS
    so we never exceed provider rate limits.

    Args:
        user_id: The Open Wearables user ID (UUID string)
        provider: The provider to backfill (default: "whoop")

    Returns:
        Summary of how many months were queued
    """
    # Import here to avoid circular imports
    from app.integrations.celery.tasks.sync_vendor_data_task import sync_vendor_data

    months = _generate_months(BACKFILL_YEARS)
    total_months = len(months)

    log_structured(
        logger,
        "info",
        f"Starting historical backfill for {provider}: queuing {total_months} months",
        provider=provider,
        task="historical_backfill",
        user_id=user_id,
    )

    for i, (start_date, end_date) in enumerate(months):
        delay_seconds = i * DELAY_BETWEEN_MONTHS_SECONDS

        sync_vendor_data.apply_async(
            kwargs={
                "user_id": user_id,
                "start_date": start_date,
                "end_date": end_date,
                "providers": [provider],
            },
            countdown=delay_seconds,
        )

        log_structured(
            logger,
            "debug",
            f"Queued backfill month {i + 1}/{total_months}: {start_date[:7]} (delay: {delay_seconds}s)",
            provider=provider,
            task="historical_backfill",
            user_id=user_id,
        )

    log_structured(
        logger,
        "info",
        f"Historical backfill queued: {total_months} months over ~{total_months * DELAY_BETWEEN_MONTHS_SECONDS // 60} minutes",
        provider=provider,
        task="historical_backfill",
        user_id=user_id,
    )

    return {
        "user_id": user_id,
        "provider": provider,
        "months_queued": total_months,
        "estimated_duration_minutes": total_months * DELAY_BETWEEN_MONTHS_SECONDS // 60,
    }
