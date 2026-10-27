import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Mail,
  MessageSquareText,
  TerminalSquare,
} from 'lucide-react';

const taskTypeIcons = {
  action: CheckCircle2,
  communication: Mail,
  document: FileText,
  event: CalendarDays,
  meeting: CalendarDays,
  review: FileText,
  technical: TerminalSquare,
};

export function getTaskIcon(taskType) {
  return taskTypeIcons[taskType] || MessageSquareText;
}
