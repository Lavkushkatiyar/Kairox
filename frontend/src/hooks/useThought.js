import { useState, useCallback, useRef } from 'react';
import { mockThought } from '../data/mockData';
import {
  createTasksFromThought,
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
  const [timeline, setTimeline] = useState([]);
  const isSubmitting = useRef(false);

  const handleStructure = useCallback(async () => {
    const thought = input;
    if (!thought.trim() || isSubmitting.current) return;

    isSubmitting.current = true;
    setIsProcessing(true);
    setIsStructured(false);
    setStructuredThought('');
    setTasks([]);
    setTimeline([]);
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
    structuredThought,
    isProcessing,
    isStructured,
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
