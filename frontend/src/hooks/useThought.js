import { useState, useCallback, useRef } from 'react';
import { mockThought } from '../data/mockData';
import {
  createTasksFromThought,
  getRawInputs,
  getTasks,
  getTasksWithDependencies,
  updateTask,
} from '../api/taskService';

export function useThought() {
  const [input, setInput] = useState('');
  const [structuredThought, setStructuredThought] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStructured, setIsStructured] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [rawInputs, setRawInputs] = useState([]);
  const [isLoadingAllTasks, setIsLoadingAllTasks] = useState(false);
  const isSubmitting = useRef(false);

  const loadAllTasks = useCallback(async () => {
    setIsLoadingAllTasks(true);
    setError('');

    try {
      const [userTasks, userInputs] = await Promise.all([getTasks(), getRawInputs()]);
      const tasksWithDependencies = await getTasksWithDependencies(userTasks);
      setAllTasks(tasksWithDependencies);
      setRawInputs(userInputs);
    } catch (loadError) {
      setError(
        loadError.response?.data?.detail || 'Could not load tasks from your thoughts.'
      );
    } finally {
      setIsLoadingAllTasks(false);
    }
  }, []);

  const handleStructure = useCallback(async () => {
    const thought = input;
    if (!thought.trim() || isSubmitting.current) return;

    isSubmitting.current = true;
    setIsProcessing(true);
    setIsStructured(false);
    setStructuredThought('');
    setTasks([]);
    setError('');
    setProcessingMessage('Submitting your thought...');

    try {
      const generatedTasks = await createTasksFromThought(thought, (status) => {
        setProcessingMessage(`Processing your thought... (${status})`);
      });
      setTasks(generatedTasks);
      setStructuredThought(thought);
      setIsStructured(true);
    } catch (processingError) {
      setError(
        processingError.response?.data?.detail ||
          processingError.message ||
          'Could not structure your thought.'
      );
    } finally {
      isSubmitting.current = false;
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [input]);

  const handleReset = useCallback(() => {
    setInput('');
    setStructuredThought('');
    setTasks([]);
    setIsStructured(false);
    setError('');
  }, []);

  const handleLoadDemo = useCallback(() => {
    setInput(mockThought);
  }, []);

  const updateTaskStatus = useCallback(
    async (taskId, newStatus) => {
      const task = tasks.find((item) => item.id === taskId)
        || allTasks.find((item) => item.id === taskId);
      if (!task) return;

      setError('');
      try {
        const updatedTask = await updateTask(task, newStatus);
        setTasks((previousTasks) =>
          previousTasks.map((item) =>
            item.id === taskId ? { ...item, ...updatedTask } : item
          )
        );
        setAllTasks((previousTasks) =>
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
    [allTasks, tasks]
  );

  return {
    input,
    setInput,
    structuredThought,
    isProcessing,
    isStructured,
    processingMessage,
    error,
    tasks,
    allTasks,
    rawInputs,
    isLoadingAllTasks,
    loadAllTasks,
    handleStructure,
    handleReset,
    handleLoadDemo,
    updateTaskStatus,
  };
}
