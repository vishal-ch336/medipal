import uuid

from sqlalchemy import Boolean, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Specialist(Base):
    __tablename__ = "specialists"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    specialty: Mapped[str] = mapped_column(String, index=True, nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    availability: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False)
    distance: Mapped[str] = mapped_column(String, nullable=False)
    accepts_insurance: Mapped[bool] = mapped_column(Boolean, nullable=False)
    urgency_level: Mapped[str] = mapped_column(String, nullable=False)
