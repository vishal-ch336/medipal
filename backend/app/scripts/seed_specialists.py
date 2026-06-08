"""
seed_specialists.py – Populate the specialists table with realistic
mock healthcare providers.

Usage (from the backend/ directory):
    python -m app.scripts.seed_specialists

The script is idempotent: it only inserts data when the table is empty,
so running it multiple times will not create duplicates.
"""

import asyncio
import sys
import uuid
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure `backend/` is on sys.path so `app.*` imports resolve when running
# the script directly.
# ---------------------------------------------------------------------------
_BACKEND_DIR = str(Path(__file__).resolve().parents[2])
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import func, select  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models.specialist import Specialist  # noqa: E402

# ---------------------------------------------------------------------------
# Mock data
# ---------------------------------------------------------------------------
SPECIALISTS: list[dict] = [
    {
        "id": uuid.uuid4(),
        "name": "Dr. Priya Sharma",
        "specialty": "General Physician",
        "rating": 4.8,
        "availability": "Today",
        "location": "Apollo Clinic, Anna Nagar, Chennai",
        "distance": "2.3 km",
        "accepts_insurance": True,
        "urgency_level": "routine",
    },
    {
        "id": uuid.uuid4(),
        "name": "Dr. Rajesh Menon",
        "specialty": "ENT Specialist",
        "rating": 4.6,
        "availability": "Tomorrow",
        "location": "Fortis Hospital, Vadapalani, Chennai",
        "distance": "5.1 km",
        "accepts_insurance": True,
        "urgency_level": "routine",
    },
    {
        "id": uuid.uuid4(),
        "name": "Dr. Anitha Krishnan",
        "specialty": "Cardiologist",
        "rating": 4.9,
        "availability": "Today",
        "location": "MIOT International, Manapakkam, Chennai",
        "distance": "8.7 km",
        "accepts_insurance": True,
        "urgency_level": "urgent",
    },
    {
        "id": uuid.uuid4(),
        "name": "Dr. Vikram Patel",
        "specialty": "Dermatologist",
        "rating": 4.5,
        "availability": "Wed, Jun 11",
        "location": "Skin & Hair Clinic, T. Nagar, Chennai",
        "distance": "3.4 km",
        "accepts_insurance": False,
        "urgency_level": "routine",
    },
    {
        "id": uuid.uuid4(),
        "name": "Dr. Meera Subramaniam",
        "specialty": "Pediatrician",
        "rating": 4.7,
        "availability": "Today",
        "location": "Kanchi Kamakoti CHILDS Trust Hospital, Nungambakkam",
        "distance": "4.0 km",
        "accepts_insurance": True,
        "urgency_level": "urgent",
    },
    {
        "id": uuid.uuid4(),
        "name": "Dr. Arjun Nair",
        "specialty": "Orthopedic Surgeon",
        "rating": 4.4,
        "availability": "Tomorrow",
        "location": "Sri Ramachandra Hospital, Porur, Chennai",
        "distance": "12.2 km",
        "accepts_insurance": True,
        "urgency_level": "routine",
    },
    {
        "id": uuid.uuid4(),
        "name": "Dr. Kavitha Rangan",
        "specialty": "Neurologist",
        "rating": 4.8,
        "availability": "Thu, Jun 12",
        "location": "Global Health City, Perumbakkam, Chennai",
        "distance": "15.6 km",
        "accepts_insurance": True,
        "urgency_level": "urgent",
    },
]


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------
async def seed_data() -> None:
    """Insert mock specialists only if the table is currently empty."""

    async with SessionLocal() as session:
        # Check if any specialists already exist
        result = await session.execute(select(func.count(Specialist.id)))
        count = result.scalar_one()

        if count > 0:
            print(f"Specialists table already has {count} rows – skipping seed.")
            return

        for entry in SPECIALISTS:
            session.add(Specialist(**entry))

        await session.commit()
        print(f"[OK] Seeded {len(SPECIALISTS)} specialists into the database.")


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    asyncio.run(seed_data())
