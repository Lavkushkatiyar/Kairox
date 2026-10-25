import { useState, useCallback, useEffect } from 'react';
import { mockTasks, mockThought } from '../data/mockData';
import {
  createTasksFromThought,
  getTasks,
  getTasksWithDependencies,
  updateTask,
} from '../api/taskService';

export function useThought() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStructured, setIsStructured] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    let isActive = true;

    getTasks()
      .then((loadedTasks) => {
        if (isActive) setTasks(loadedTasks);
      })
      .catch((loadError) => {
        if (isActive) {
          setError(loadError.response?.data?.detail || 'Could not load your tasks.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingTasks(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleStructure = useCallback(async () => {
return setIsStructured(true)
},[input])

  const handleReset = useCallback(() => {
    setInput('');
    setIsStructured(false);
    setTimeline([]);
    setError('');
  }, []);

  const handleLoadDemo = useCallback(() => {
    setInput(mockThought);
  }, []);

  const updateTaskStatus = useCallback(
    async (taskId, newStatus) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;

      setError('');
      try {
        const updatedTask = await updateTask(task, newStatus);
        setTasks((previousTasks) =>
          previousTasks.map((item) =>
            item.id === taskId ? { ...item, ...updatedTask } : item
          )
        );
      } catch (updateError) {
        setError(
          updateError.response?.data?.detail || 'Could not update the task status.'
        );
      }
    },
    [tasks]
  );

  return {
    input,
    setInput,
    isProcessing,
    isStructured,
    isLoadingTasks,
    processingMessage,
    error,
    tasks,
    timeline,
    handleStructure,
    handleReset,
    handleLoadDemo,
    updateTaskStatus,
  };
}
