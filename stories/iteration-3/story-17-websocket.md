# Story 17: Real-Time Updates via WebSocket

| Field | Details |
|-------|---------|
| **Iteration** | 3 — Automation |
| **Story #** | 17 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 8 (Redis Setup) |
| **Blocks** | Story 18 (Progress Tracking) |
| **Estimated Effort** | 2–3 days |

---

## User Story

**As a** user,  
**I want** real-time updates when my input is processed or tasks change,  
**So that** I don't have to keep refreshing the page.

---

## Description

Replace polling with WebSocket push notifications. Use Redis Pub/Sub to broadcast events from Celery workers to connected WebSocket clients.

---

## Backend Tasks

### 17.1 — WebSocket Manager (`services/websocket_manager.py`)

```python
from fastapi import WebSocket
from typing import Dict, Set
import json

class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}  # user_id → set of websockets

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.connections:
            self.connections[user_id] = set()
        self.connections[user_id].add(websocket)

    async def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.connections:
            self.connections[user_id].discard(websocket)

    async def send_to_user(self, user_id: str, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        if user_id in self.connections:
            dead = set()
            for ws in self.connections[user_id]:
                try:
                    await ws.send_text(message)
                except:
                    dead.add(ws)
            self.connections[user_id] -= dead

ws_manager = WebSocketManager()
```

### 17.2 — WebSocket Endpoint

```python
@app.websocket("/api/v1/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Authenticate via JWT token
    user = authenticate_ws(token)
    if not user:
        await websocket.close(code=4001)
        return
    
    await ws_manager.connect(str(user.id), websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep-alive
    except WebSocketDisconnect:
        await ws_manager.disconnect(str(user.id), websocket)
```

### 17.3 — Redis Pub/Sub Listener

Background task that listens to Redis Pub/Sub and forwards to WebSocket clients:
```python
async def redis_pub_sub_listener():
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.psubscribe("user:*")
    
    async for message in pubsub.listen():
        if message["type"] == "pmessage":
            channel = message["channel"]
            user_id = channel.split(":")[1]
            data = json.loads(message["data"])
            await ws_manager.send_to_user(user_id, data["event"], data["data"])
```

### 17.4 — Event Types

| Event | Trigger | Data |
|-------|---------|------|
| `input.processing` | Worker starts processing | `{ input_id }` |
| `input.completed` | Processing done | `{ input_id, task_count, draft_count }` |
| `input.failed` | Processing failed | `{ input_id, error }` |
| `task.updated` | Task status changed | `{ task_id, status }` |
| `reminder.fired` | Reminder sent | `{ reminder_id, task_title }` |
| `draft.generated` | New draft ready | `{ draft_id, task_id }` |

### 17.5 — Publish from Workers

```python
# In Celery workers:
redis = get_sync_redis()
redis.publish(f"user:{user_id}", json.dumps({
    "event": "input.completed",
    "data": {"input_id": input_id, "task_count": 3}
}))
```

---

## Frontend Tasks

### 17.6 — `useWebSocket` Hook

```javascript
function useWebSocket() {
  const [socket, setSocket] = useState(null);
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws?token=${token}`);
    ws.onmessage = (event) => {
      const { event: eventName, data } = JSON.parse(event.data);
      handleEvent(eventName, data);
    };
    ws.onclose = () => setTimeout(() => reconnect(), 3000); // Auto-reconnect
    setSocket(ws);
    return () => ws.close();
  }, [token]);
}
```

### 17.7 — Event Handlers

- `input.completed` → refresh task list, show toast
- `reminder.fired` → show notification toast, update bell count
- `task.updated` → update task in list without full refresh
- `draft.generated` → show "New draft ready" toast

---

## Acceptance Criteria

- [ ] WebSocket connection established on login
- [ ] Real-time events received when input is processed
- [ ] No more polling — all updates are push-based
- [ ] Auto-reconnection works on disconnection
- [ ] Events correctly dispatched to the right user only
