# Story 13: Dependency Resolution Engine

| Field | Details |
|-------|---------|
| **Iteration** | 2 — Intelligence |
| **Story #** | 13 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 5 (Dependency Model), Story 11 (Pipeline) |
| **Blocks** | Story 21 (Structure View) |
| **Estimated Effort** | 2 days |

---

## User Story

**As a** developer,  
**I want** a robust dependency resolution engine,  
**So that** task ordering, blocked-task detection, and AI dependency linking works correctly.

---

## Description

This story enhances the basic dependency system (Story 5) with intelligent features:

1. **Fuzzy title matching** — match AI-provided dependency references to actual tasks.
2. **Topological sorting** — determine correct execution order.
3. **Cycle detection** — prevent circular dependencies (already basic in Story 5, enhanced here).
4. **Blocked task identification** — find tasks waiting for prerequisites.  
5. **Critical path analysis** — find the longest dependency chain.

---

## Backend Tasks

### 13.1 — Install Dependencies

```
pip install rapidfuzz
```

### 13.2 — Dependency Engine (`services/dependency_engine.py`)

```python
from collections import defaultdict, deque
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from uuid import UUID
from app.models.task import Task, TaskStatus
from app.models.task_dependency import TaskDependency

class DependencyEngine:

    @staticmethod
    def resolve_from_ai(
        extracted_tasks: list, 
        created_tasks: list
    ) -> list[tuple]:
        """
        Match AI-provided dependency references to created task IDs.
        Uses fuzzy matching on titles.
        Returns list of (task_id, depends_on_id) tuples.
        """
        # Build title → task mapping
        title_map = {}
        for task in created_tasks:
            title_map[task.title.lower()] = task

        dependencies = []
        for ext_task, db_task in zip(extracted_tasks, created_tasks):
            for dep_title in ext_task.depends_on_titles:
                match = DependencyEngine._fuzzy_match(
                    dep_title, title_map
                )
                if match and match.id != db_task.id:
                    dependencies.append((db_task.id, match.id))

        return dependencies

    @staticmethod
    def _fuzzy_match(query: str, title_map: dict, threshold: int = 70):
        """Find best matching task by title similarity."""
        query_lower = query.lower().strip()
        
        # Exact match
        if query_lower in title_map:
            return title_map[query_lower]
        
        # Fuzzy match
        best_score = 0
        best_match = None
        for title, task in title_map.items():
            score = fuzz.ratio(query_lower, title)
            partial_score = fuzz.partial_ratio(query_lower, title)
            combined = max(score, partial_score)
            if combined > best_score and combined >= threshold:
                best_score = combined
                best_match = task
        
        return best_match

    @staticmethod
    def build_graph(db: Session, user_id: UUID) -> dict:
        """Build adjacency list of task dependencies."""
        tasks = db.query(Task).filter(
            Task.user_id == user_id,
            Task.status.notin_([TaskStatus.CANCELLED])
        ).all()
        
        deps = db.query(TaskDependency).filter(
            TaskDependency.task_id.in_([t.id for t in tasks])
        ).all()
        
        graph = defaultdict(set)       # task → depends_on
        reverse_graph = defaultdict(set)  # task → depended_on_by
        all_tasks = {t.id: t for t in tasks}
        
        for dep in deps:
            graph[dep.task_id].add(dep.depends_on_id)
            reverse_graph[dep.depends_on_id].add(dep.task_id)
        
        return {
            "graph": graph,
            "reverse_graph": reverse_graph,
            "tasks": all_tasks
        }

    @staticmethod
    def topological_sort(db: Session, user_id: UUID) -> list:
        """
        Return tasks in execution order (prerequisites first).
        Uses Kahn's algorithm (BFS-based topological sort).
        """
        data = DependencyEngine.build_graph(db, user_id)
        graph = data["graph"]
        tasks = data["tasks"]
        
        # Calculate in-degrees
        in_degree = defaultdict(int)
        for task_id in tasks:
            in_degree[task_id] = len(graph.get(task_id, set()))
        
        # Start with tasks that have no dependencies
        queue = deque([
            tid for tid, degree in in_degree.items() if degree == 0
        ])
        
        sorted_tasks = []
        while queue:
            current = queue.popleft()
            sorted_tasks.append(tasks[current])
            
            # Find tasks that depend on current
            for dependent_id, deps in graph.items():
                if current in deps:
                    in_degree[dependent_id] -= 1
                    if in_degree[dependent_id] == 0:
                        queue.append(dependent_id)
        
        # Check for cycles (if not all tasks are sorted)
        if len(sorted_tasks) < len(tasks):
            unsorted = [
                tasks[tid] for tid in tasks if tasks[tid] not in sorted_tasks
            ]
            # These tasks are in cycles
            sorted_tasks.extend(unsorted)
        
        return sorted_tasks

    @staticmethod
    def get_blocked_tasks(db: Session, user_id: UUID) -> list:
        """Get tasks that have incomplete prerequisites."""
        data = DependencyEngine.build_graph(db, user_id)
        graph = data["graph"]
        tasks = data["tasks"]
        
        blocked = []
        for task_id, deps in graph.items():
            if not deps:
                continue
            task = tasks.get(task_id)
            if not task or task.status in (TaskStatus.DONE, TaskStatus.CANCELLED):
                continue
            
            incomplete_deps = []
            for dep_id in deps:
                dep_task = tasks.get(dep_id)
                if dep_task and dep_task.status != TaskStatus.DONE:
                    incomplete_deps.append(dep_task)
            
            if incomplete_deps:
                blocked.append({
                    "task": task,
                    "blocked_by": incomplete_deps
                })
        
        return blocked

    @staticmethod
    def get_ready_tasks(db: Session, user_id: UUID) -> list:
        """Get tasks with all prerequisites completed (ready to work on)."""
        data = DependencyEngine.build_graph(db, user_id)
        graph = data["graph"]
        tasks = data["tasks"]
        
        ready = []
        for task_id, task in tasks.items():
            if task.status != TaskStatus.TODO:
                continue
            
            deps = graph.get(task_id, set())
            if not deps:
                ready.append(task)
                continue
            
            all_done = all(
                tasks.get(dep_id) and tasks[dep_id].status == TaskStatus.DONE
                for dep_id in deps
            )
            if all_done:
                ready.append(task)
        
        return ready

    @staticmethod
    def get_critical_path(db: Session, user_id: UUID) -> list:
        """Find the longest dependency chain (critical path)."""
        data = DependencyEngine.build_graph(db, user_id)
        graph = data["graph"]
        tasks = data["tasks"]
        
        # DFS to find longest path
        memo = {}
        
        def dfs(task_id):
            if task_id in memo:
                return memo[task_id]
            
            deps = graph.get(task_id, set())
            if not deps:
                memo[task_id] = [task_id]
                return [task_id]
            
            longest = []
            for dep_id in deps:
                path = dfs(dep_id)
                if len(path) > len(longest):
                    longest = path
            
            result = longest + [task_id]
            memo[task_id] = result
            return result
        
        # Find the longest path across all tasks
        longest_path = []
        for task_id in tasks:
            path = dfs(task_id)
            if len(path) > len(longest_path):
                longest_path = path
        
        return [tasks[tid] for tid in longest_path if tid in tasks]
```

### 13.3 — API Endpoints (`api/v1/tasks.py` additions)

```python
@router.get("/execution-order")
def get_execution_order(current_user, db):
    """Get tasks in recommended execution order."""
    tasks = DependencyEngine.topological_sort(db, current_user.id)
    return {"tasks": [TaskRead.from_orm(t) for t in tasks]}

@router.get("/blocked")
def get_blocked_tasks(current_user, db):
    """Get tasks that are blocked by incomplete prerequisites."""
    blocked = DependencyEngine.get_blocked_tasks(db, current_user.id)
    return {"blocked_tasks": blocked}

@router.get("/ready")
def get_ready_tasks(current_user, db):
    """Get tasks that are ready to work on (prerequisites done)."""
    ready = DependencyEngine.get_ready_tasks(db, current_user.id)
    return {"ready_tasks": [TaskRead.from_orm(t) for t in ready]}

@router.get("/critical-path")
def get_critical_path(current_user, db):
    """Get the critical path (longest dependency chain)."""
    path = DependencyEngine.get_critical_path(db, current_user.id)
    return {"critical_path": [TaskRead.from_orm(t) for t in path]}
```

---

## Frontend Tasks

### 13.4 — Execution Order View

- Numbered list showing recommended task order
- Step indicators (1, 2, 3...)
- Ready tasks highlighted in green
- Blocked tasks highlighted in red with "Blocked by..." label

### 13.5 — Dependency Arrows in Task List

- Visual arrows/lines connecting dependent tasks
- Color: green (prerequisite done), red (prerequisite pending)

---

## Acceptance Criteria

- [ ] Fuzzy matching correctly links AI dependency references to tasks (≥70% similarity)
- [ ] Topological sort returns correct execution order
- [ ] Blocked tasks are accurately identified
- [ ] Ready tasks are accurately identified
- [ ] Critical path is correctly calculated
- [ ] Cycles don't crash the system (handled gracefully)
- [ ] Unit tests cover: sort, cycle detection, fuzzy matching, blocked/ready

---

## Notes

- `rapidfuzz` is faster than `fuzzywuzzy` (C-based).
- Kahn's algorithm is O(V+E) — efficient for dependency graphs.
- Critical path helps users focus on the most impactful work.
