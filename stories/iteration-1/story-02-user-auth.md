# Story 2: User Data Model & Authentication (Basic)

| Field | Details |
|-------|---------|
| **Iteration** | 1 — Foundation |
| **Story #** | 2 of 24 |
| **Priority** | 🔴 Critical |
| **Depends On** | Story 1 (Scaffolding) |
| **Blocks** | Stories 3, 4, 5, 6, 7 (all models need user scoping) |
| **Estimated Effort** | 2–3 days |

---

## User Story

**As a** user,  
**I want** to register and log in with my email and password,  
**So that** my tasks, inputs, and data are private and scoped to my account.

---

## Description

Authentication is the gateway to all user-facing features. This story implements:

1. **User model** in PostgreSQL with hashed passwords.
2. **JWT-based authentication** with access and refresh tokens.
3. **Registration and login API endpoints**.
4. **Frontend auth pages** (login, register) with token management.
5. **Protected route middleware** for both backend and frontend.

We keep auth simple and focused — no OAuth, no email verification, no 2FA. Those are future enhancements.

---

## Backend Tasks

### 2.1 — Install Auth Dependencies

```
pip install passlib[bcrypt] python-jose[cryptography]
```

Add to `requirements.txt` / `pyproject.toml`.

### 2.2 — Create User Model (`models/user.py`)

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Key decisions:**
- `UUID` primary key — globally unique, no sequential guessing
- `email` indexed and unique — fast lookup for login
- `timezone` stored for time resolution engine (Story 12)
- `is_active` for soft-disable without deleting

### 2.3 — Create Pydantic Schemas (`schemas/user.py`)

```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

# --- Request Schemas ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str  # min 8 chars, validated in service
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: str | None = None
    timezone: str | None = None

# --- Response Schemas ---

class UserRead(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_active: bool
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
```

### 2.4 — Password Hashing Utility (`utils/security.py`)

```python
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        return None
```

### 2.5 — Auth Service (`services/auth_service.py`)

```python
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, TokenResponse, UserRead
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token

class AuthService:

    @staticmethod
    def register(db: Session, data: UserCreate) -> TokenResponse:
        # 1. Check if email already exists
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise ValueError("Email already registered")

        # 2. Validate password strength
        if len(data.password) < 8:
            raise ValueError("Password must be at least 8 characters")

        # 3. Create user
        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 4. Generate tokens
        token_data = {"sub": str(user.id), "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    @staticmethod
    def login(db: Session, data: UserLogin) -> TokenResponse:
        # 1. Find user by email
        user = db.query(User).filter(User.email == data.email).first()
        if not user:
            raise ValueError("Invalid email or password")

        # 2. Verify password
        if not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid email or password")

        # 3. Check if active
        if not user.is_active:
            raise ValueError("Account is deactivated")

        # 4. Generate tokens
        token_data = {"sub": str(user.id), "email": user.email}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    @staticmethod
    def get_current_user(db: Session, token: str) -> User:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise ValueError("Invalid or expired token")

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise ValueError("User not found")
        return user
```

### 2.6 — Auth Dependency (`api/deps.py`)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    try:
        user = AuthService.get_current_user(db, credentials.credentials)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
```

### 2.7 — Auth API Endpoints (`api/v1/auth.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserRead, TokenResponse
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    try:
        return AuthService.register(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password."""
    try:
        return AuthService.login(db, data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return current_user

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Get new access token using refresh token."""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
```

---

## Frontend Tasks

### 2.8 — Install Frontend Auth Dependencies

```
npm install zustand
```

### 2.9 — Auth Service (`services/authService.js`)

```javascript
import api from './api';

const authService = {
  register: async (email, password, fullName) => {
    const response = await api.post('/api/v1/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },

  saveTokens: (tokens) => {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  },

  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getAccessToken: () => localStorage.getItem('access_token'),

  isAuthenticated: () => !!localStorage.getItem('access_token'),
};

export default authService;
```

### 2.10 — Auth Store (`store/authStore.js`)

```javascript
import { create } from 'zustand';
import authService from '../services/authService';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const tokens = await authService.login(email, password);
    authService.saveTokens(tokens);
    const user = await authService.getMe();
    set({ user, isAuthenticated: true });
  },

  register: async (email, password, fullName) => {
    const tokens = await authService.register(email, password, fullName);
    authService.saveTokens(tokens);
    const user = await authService.getMe();
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    authService.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      if (authService.isAuthenticated()) {
        const user = await authService.getMe();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      authService.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export default useAuthStore;
```

### 2.11 — Login Page (`pages/LoginPage.jsx`)

- [ ] Email input field with validation
- [ ] Password input field with show/hide toggle
- [ ] "Login" button with loading state
- [ ] Link to registration page
- [ ] Error message display (invalid credentials, etc.)
- [ ] On success: store tokens → redirect to dashboard

### 2.12 — Register Page (`pages/RegisterPage.jsx`)

- [ ] Full name input
- [ ] Email input with validation
- [ ] Password input with strength indicator
- [ ] Confirm password field
- [ ] "Register" button with loading state
- [ ] Link to login page
- [ ] On success: store tokens → redirect to dashboard

### 2.13 — Protected Route Component (`components/ProtectedRoute.jsx`)

```javascript
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}
```

### 2.14 — Router Setup (`App.jsx`)

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Database Tasks

### 2.15 — Generate Migration

```bash
alembic revision --autogenerate -m "create_users_table"
alembic upgrade head
```

### 2.16 — Verify Table Structure

After migration, verify the `users` table has:
- `id` — UUID primary key
- `email` — VARCHAR(255), unique, indexed
- `hashed_password` — VARCHAR(255)
- `full_name` — VARCHAR(255)
- `is_active` — BOOLEAN, default true
- `timezone` — VARCHAR(50), default 'UTC'
- `created_at` — TIMESTAMP
- `updated_at` — TIMESTAMP

---

## Acceptance Criteria

- [ ] `POST /api/v1/auth/register` creates a new user and returns JWT tokens
- [ ] Duplicate email registration returns 400 error
- [ ] `POST /api/v1/auth/login` returns JWT tokens for valid credentials
- [ ] Invalid credentials return 401 error
- [ ] `GET /api/v1/auth/me` returns user profile (protected endpoint)
- [ ] Unauthenticated requests to `/me` return 401
- [ ] Frontend login flow works: login → store token → redirect to dashboard
- [ ] Frontend register flow works: register → store token → redirect
- [ ] Page refresh maintains auth state (token persists in localStorage)
- [ ] Logout clears tokens and redirects to login

---

## Files Created / Modified

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/user.py` | NEW | User SQLAlchemy model |
| `backend/app/schemas/user.py` | NEW | Pydantic schemas for auth |
| `backend/app/utils/security.py` | NEW | Password hashing + JWT utils |
| `backend/app/services/auth_service.py` | NEW | Auth business logic |
| `backend/app/api/deps.py` | NEW | FastAPI dependencies (get_current_user) |
| `backend/app/api/v1/auth.py` | NEW | Auth API endpoints |
| `frontend/src/services/authService.js` | NEW | Auth API client |
| `frontend/src/store/authStore.js` | NEW | Auth state management |
| `frontend/src/pages/LoginPage.jsx` | NEW | Login page |
| `frontend/src/pages/RegisterPage.jsx` | NEW | Register page |
| `frontend/src/components/ProtectedRoute.jsx` | NEW | Route guard |

---

## Notes

- Do NOT implement email verification in this story — it's a future enhancement.
- Do NOT implement OAuth — keep it simple with email/password only.
- Passwords are never stored in plain text; always hashed with bcrypt.
- Access tokens are short-lived (30 min); refresh tokens last 7 days.
- The `timezone` field on User is needed for Story 12 (Time Resolver).
