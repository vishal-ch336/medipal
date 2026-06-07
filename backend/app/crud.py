from sqlalchemy.orm import Session
from app.models import User
from app.schemas import UserCreate
from app.dependencies import get_password_hash


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email.ilike(email)).first()


def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user