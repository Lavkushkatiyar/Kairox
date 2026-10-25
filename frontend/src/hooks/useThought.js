import { useState, useCallback, useEffect } from 'react';
import { mockThought } from '../data/mockData';
import {
  createTasksFromThought,
  getTasks,
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
    if (!input.trim()) return;
    return "will imlement soon "
    // setError('');
    // setIsProcessing(true);
    // setProcessingMessage('Sending your thought...');

    // try {
    //   const createdTasks = await createTasksFromThought(input, (status) => {
    //     setProcessingMessage(
    //       status === 'processing'
    //         ? 'Organizing your thought into tasks...'
    //         : 'Your thought is queued. Waiting for the task processor...'
    //     );
    //   });
    //   setTasks((existingTasks) => {
    //     const createdTaskIds = new Set(createdTasks.map((task) => task.id));
    //     return [
    //       ...createdTasks,
    //       ...existingTasks.filter((task) => !createdTaskIds.has(task.id)),
    //     ];
    //   });
    //   setTimeline([]);
    //   setIsStructured(true);
    // } catch (processingError) {
    //   setError(
    //     processingError.response?.data?.detail ||
    //       processingError.message ||
    //       'Could not process your thought.'
    //   );
    // } finally {
    //   setIsProcessing(false);
    //   setProcessingMessage('');
    // }
  }, [input]);

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
