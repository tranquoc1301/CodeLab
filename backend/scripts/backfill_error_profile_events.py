#!/usr/bin/env python3
"""Backfill submission_error_events from historical submit submissions."""

import asyncio

from app.core.database import async_session
from app.services.error_profile import backfill_submission_error_events


async def main() -> None:
    async with async_session() as session:
        processed = await backfill_submission_error_events(session)
        await session.commit()
    print(f"Backfilled submission_error_events rows: {processed}")


if __name__ == "__main__":
    asyncio.run(main())
