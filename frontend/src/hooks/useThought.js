import { useState, useCallback } from 'react';
import { mockTasks, mockTimeline, mockThought } from '../data/mockData';

export function useThought() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStructured, setIsStructured] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);

  const handleStructure = useCallback(() => {
    if (!input.trim()) return;
    setIsProcessing(true);

    // Simulate AI processing delay
    setTimeout(() => {
      setTasks(mockTasks);
      setTimeline(mockTimeline);
      setIsProcessing(false);
      setIsStructured(true);
    }, 2200);
  }, [input]);

  const handleReset = useCallback(() => {
    setInput('');
    setIsStructured(false);
    setTasks([]);
    setTimeline([]);
  }, []);

  const handleLoadDemo = useCallback(() => {
    setInput(mockThought);
  }, []);

  const updateTaskStatus = useCallback((taskId, newStatus) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );
  }, []);

  return {
    input,
    setInput,
    isProcessing,
    isStructured,
    tasks,
    timeline,
    handleStructure,
    handleReset,
    handleLoadDemo,
    updateTaskStatus,
  };
}
