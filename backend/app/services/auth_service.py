from time import timezone
from sqlalchemy.orm import Session

from app.models.user import User

from app.schemas.user import UserCreate, UserLogin, TokenResponse,AccessTokenResponse

from app.config import settings


from app.utils.security import (
    hash_password,
    verify_password,
    create_refresh_token,
    create_access_token,
    decode_token
)


class AuthService:
    @staticmethod
    def register(db:Session, data:UserCreate):
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise ValueError("User with this email already exists")
        
        hashed_password = hash_password(data.password)
        print("existing_user",existing_user)
        print("hashed_password",hashed_password)
        print("data",data)

        user = User(
            email=data.email,
            hashed_password=hashed_password,
            full_name=data.full_name,
           timezone="UTC",
            is_active=True
        )
        print("till here ")
        db.add(user)
        db.commit()
        db.refresh(user)
        payload = {
            "user_id": str(user.id),
            "email": user.email
        }

        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
       

    @staticmethod
    def login(db:Session, data:UserLogin):
        user = db.query(User).filter(User.email == data.email).first()
        if not user:
            raise ValueError("User with this email not found")
        
        if not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid password")
        
        payload = {
            "user_id": str(user.id),
            "email": user.email
        }

        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    @staticmethod
    def get_current_user(db: Session, token: str) -> User:

        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise ValueError("Invalid token")

        user_id = payload.get("user_id")

        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active:
            raise ValueError("User not found")

        return user

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str):

        payload = decode_token(refresh_token)

        if not payload:
            raise ValueError("Invalid token")

        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")

        user_id = payload.get("user_id")

        if not user_id:
             raise ValueError("Invalid token payload")

        user = db.query(User).filter(User.id == user_id).first()

        if not user or not user.is_active:
            raise ValueError("User not found")

        new_payload = {
            "user_id": str(user.id),
            "email": user.email
        }

        access_token = create_access_token(new_payload)

        return AccessTokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )    