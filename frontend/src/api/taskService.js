import apiClient from './client';

const POLL_INTERVAL_MS = 2000;
const PROCESSING_TIMEOUT_MS = 180000;

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export async function getTasks() {
  const response = await apiClient.get('/tasks');
  return response.data;
}

export async function createTasksFromThought(text, onStatusChange) {
  const inputResponse = await apiClient.post('/inputs', {
    text,
    source: 'manual',
  });
  const inputId = inputResponse.data.id;
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const resultResponse = await apiClient.get(`/inputs/${inputId}/result`);
    const result = resultResponse.data;

    if (result.status === 'completed') {
      return result.tasks;
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'The thought could not be processed.');
    }

    onStatusChange?.(result.status);
    await wait(POLL_INTERVAL_MS);
  }

  throw new Error(
    'Task processing is taking longer than expected. You can check your tasks again shortly.'
  );
}

export async function updateTask(task, status) {
  const response = await apiClient.patch(`/tasks/${task.id}`, {
    title: task.title,
    description: task.description || '',
    status,
    priority: task.priority,
    task_type: task.task_type,
    due_at: task.due_at,
  });

  return response.data;
}
