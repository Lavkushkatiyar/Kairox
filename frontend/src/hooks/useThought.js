import { useState, useCallback, useRef } from 'react';
import { mockThought } from '../data/mockData';
import {
  createTasksFromThought,
  deleteTask,
  deleteRawInput,
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
      setTasks(await getTasksWithDependencies(generatedTasks));
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

  const updateTaskDetails = useCallback(
    async (taskId, updates) => {
      const task = tasks.find((item) => item.id === taskId)
        || allTasks.find((item) => item.id === taskId);
      if (!task) return null;

      setError('');
      try {
        const updatedTask = await updateTask(task, updates);
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
        return updatedTask;
      } catch (updateError) {
        setError(
          updateError.response?.data?.detail || 'Could not update the task status.'
        );
        return null;
      }
    },
    [allTasks, tasks]
  );

  const updateTaskStatus = useCallback(
    (taskId, newStatus) => updateTaskDetails(taskId, { status: newStatus }),
    [updateTaskDetails]
  );

  const removeRawInput = useCallback(
    async (inputId) => {
      setError('');
      try {
        await deleteRawInput(inputId);
        setRawInputs((previousInputs) =>
          previousInputs.filter((rawInput) => rawInput.id !== inputId)
        );
        const unlinkTasks = (previousTasks) =>
          previousTasks.map((task) =>
            task.input_id === inputId ? { ...task, input_id: null } : task
          );
        setTasks(unlinkTasks);
        setAllTasks(unlinkTasks);
        return true;
      } catch (deleteError) {
        setError(
          deleteError.response?.data?.detail || 'Could not delete the thought.'
        );
        return false;
      }
    },
    []
  );

  const removeTask = useCallback(
    async (taskId) => {
      setError('');
      try {
        await deleteTask(taskId);
        const removeTaskAndDependency = (items) => items
          .filter((item) => item.id !== taskId)
          .map((item) => ({
            ...item,
            depends_on_ids: (item.depends_on_ids || []).filter((id) => id !== taskId),
          }));
        setTasks(removeTaskAndDependency);
        setAllTasks(removeTaskAndDependency);
        return true;
      } catch (deleteError) {
        setError(deleteError.response?.data?.detail || 'Could not delete the task.');
        return false;
      }
    },
    []
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
    updateTaskDetails,
    removeRawInput,
    removeTask,
  };
}
