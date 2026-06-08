"""
specialists.py – REST endpoint to query the specialists table.

GET /specialists/              → all specialists
GET /specialists/?specialty=…  → filtered by specialty (case-insensitive substring match)
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.specialist import Specialist

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------
class SpecialistOut(BaseModel):
    id: str
    name: str
    specialty: str
    rating: float
    availability: str
    location: str
    distance: str
    accepts_insurance: bool
    urgency_level: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# GET /specialists/
# ---------------------------------------------------------------------------
@router.get("/", response_model=list[SpecialistOut])
async def list_specialists(
    specialty: str | None = Query(default=None, description="Filter by specialty (case-insensitive substring)"),
    db: AsyncSession = Depends(get_db),
):
    """Return all specialists, optionally filtered by specialty."""
    stmt = select(Specialist)

    if specialty:
        stmt = stmt.where(Specialist.specialty.ilike(f"%{specialty}%"))

    stmt = stmt.order_by(Specialist.rating.desc())

    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        SpecialistOut(
            id=str(row.id),
            name=row.name,
            specialty=row.specialty,
            rating=row.rating,
            availability=row.availability,
            location=row.location,
            distance=row.distance,
            accepts_insurance=row.accepts_insurance,
            urgency_level=row.urgency_level,
        )
        for row in rows
    ]
