from pydantic import BaseModel
from uuid import UUID


class Token(BaseModel):
    access_token: str


class TokenData(BaseModel):
    email: str | None = None


class SpecialistBase(BaseModel):
    name: str
    specialty: str
    rating: int
    availability: str
    location: str


class SpecialistCreate(SpecialistBase):
    pass


class Specialist(SpecialistBase):
    id: UUID

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: UUID
    is_active: bool

    class Config:
        from_attributes = True