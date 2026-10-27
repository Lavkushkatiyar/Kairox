import apiClient from './client';

const INITIAL_POLL_INTERVAL_MS = 2000;
const MAX_POLL_INTERVAL_MS = 10000;
const PROCESSING_TIMEOUT_MS = 600000;

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export async function getTasks() {
  const response = await apiClient.get('/tasks');
  return response.data;
}

export async function getRawInputs() {
  const response = await apiClient.get('/inputs');
  return response.data;
}

export async function getTaskDependencies(taskId) {
  const response = await apiClient.get(`/task/${taskId}/dependencies`);
  return response.data;
}

export async function createTasksFromThought(text, onStatusChange) {
  const inputResponse = await apiClient.post('/inputs', {
    text,
    source: 'manual',
  });
  const inputId = inputResponse.data.id;
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  let pollInterval = INITIAL_POLL_INTERVAL_MS;

  while (Date.now() < deadline) {
    const resultResponse = await apiClient.get(`/inputs/${inputId}/result`);
    const result = resultResponse.data;

    if (result.status === 'completed') {
      if (!Array.isArray(result.tasks)) {
        throw new Error('Task processing completed without a task list.');
      }
      return result.tasks;
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'The thought could not be processed.');
    }

    if (result.status !== 'pending' && result.status !== 'processing') {
      throw new Error(`Unexpected task processing status: ${result.status}`);
    }

    onStatusChange?.(result.status);
    await wait(Math.min(pollInterval, deadline - Date.now()));
    pollInterval = Math.min(pollInterval * 1.5, MAX_POLL_INTERVAL_MS);
  }

  throw new Error(
    'Task processing is still in progress. Your input is saved; check the Tasks page shortly.'
  );
}

export async function getTasksWithDependencies(tasks) {
  return Promise.all(
    tasks.map(async (task) => {
      const dependencies = await getTaskDependencies(task.id);
      return {
        ...task,
        depends_on_ids: dependencies.map((dependency) => dependency.depends_on_id),
      };
    })
  );
}

export async function updateTask(task, updates) {
  const response = await apiClient.patch(`/tasks/${task.id}`, {
    title: updates.title ?? task.title,
    description: updates.description ?? task.description ?? '',
    status: updates.status ?? task.status,
    priority: updates.priority ?? task.priority,
    task_type: updates.task_type ?? task.task_type,
    due_at: Object.hasOwn(updates, 'due_at') ? updates.due_at : task.due_at,
  });

  return {
    ...response.data,
    due_at: response.data.due_at
      ?? response.data.due_time
      ?? (Object.hasOwn(updates, 'due_at') ? updates.due_at : task.due_at),
  };
}

export async function deleteTask(taskId) {
  const response = await apiClient.delete(`/tasks/${taskId}`);
  return response.data;
}
