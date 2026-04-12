# Story 21: Structure View (Tree/Hierarchy)

| Field | Details |
|-------|---------|
| **Iteration** | 4 — Polish & Scale |
| **Story #** | 21 of 24 |
| **Priority** | 🟡 High |
| **Depends On** | Story 4 (Tasks), Story 13 (Dependency Engine) |
| **Estimated Effort** | 2–3 days |

---

## User Story

**As a** user,  
**I want** a tree view of my tasks and dependencies,  
**So that** I can see parent-child relationships and the execution path clearly.

---

## Description

A secondary view that shows tasks as a tree/graph based on their dependency relationships. Root tasks (no prerequisites) at the top, dependent tasks nested below.

---

## Backend Tasks

### 21.1 — Tree Endpoint (`api/v1/tasks.py`)

```python
@router.get("/tree")
def get_task_tree(current_user, db):
    """Get tasks as a nested tree structure based on dependencies."""
    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != TaskStatus.CANCELLED
    ).all()
    
    deps = db.query(TaskDependency).filter(
        TaskDependency.task_id.in_([t.id for t in tasks])
    ).all()
    
    # Find root tasks (not dependent on anything)
    has_dependency = {d.task_id for d in deps}
    roots = [t for t in tasks if t.id not in has_dependency]
    
    # Build children map
    children_map = defaultdict(list)  # parent_id → list of child tasks
    for dep in deps:
        child = next((t for t in tasks if t.id == dep.task_id), None)
        if child:
            children_map[dep.depends_on_id].append(child)
    
    def build_tree(task):
        return {
            "task": TaskRead.from_orm(task),
            "children": [build_tree(c) for c in children_map.get(task.id, [])]
        }
    
    tree = [build_tree(root) for root in roots]
    
    # Add orphan tasks (no dependencies in either direction)
    all_in_tree = has_dependency | {d.depends_on_id for d in deps}
    orphans = [t for t in tasks if t.id not in all_in_tree]
    for orphan in orphans:
        tree.append({"task": TaskRead.from_orm(orphan), "children": []})
    
    return {"tree": tree}
```

### 21.2 — Execution Order Endpoint

```python
@router.get("/execution-order")
def get_execution_order(current_user, db):
    """Topologically sorted task list with step numbers."""
    sorted_tasks = DependencyEngine.topological_sort(db, current_user.id)
    return {
        "execution_order": [
            {"step": i + 1, "task": TaskRead.from_orm(t)}
            for i, t in enumerate(sorted_tasks)
        ]
    }
```

---

## Frontend Tasks

### 21.3 — Structure Page Design

**Layout:**
- Tab alongside Timeline: "Timeline" | "Structure" | (future: "Graph")
- Tree rendered vertically with indentation
- Connecting lines between parent and children nodes

**Tree Nodes:**
- Each node is a mini task card: title, status badge, priority color
- Expand/collapse arrow for nodes with children
- Depth level shown by indentation  

**Interactivity:**
- Click node → opens Task Detail
- Drag-and-drop to reorder within same level (updates sort_order)
- Right-click → quick actions (done, edit, add dependency)

**Visual enhancements:**
- Critical path highlighted in bold/different color
- Blocked nodes have a red glow
- Ready-to-work nodes have a green pulse
- Completed nodes are slightly faded (but still visible)
- Smooth expand/collapse animations

### 21.4 — Install Tree Library

Consider using `react-d3-tree` or building a custom CSS tree.

---

## Acceptance Criteria

- [ ] Tree view correctly shows task hierarchy based on dependencies
- [ ] Root tasks at top, dependent tasks nested below
- [ ] Orphan tasks shown in separate section
- [ ] Expand/collapse works with smooth animations
- [ ] Critical path is highlighted
- [ ] Blocked tasks visually distinct from ready tasks
- [ ] Click navigates to task detail
