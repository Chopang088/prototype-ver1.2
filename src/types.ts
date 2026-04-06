export interface Instructor {
  name: string;
  title: string;
}

export interface Assignment {
  id: string;
  title: string;
  course: string;
  courseName: string;
  due: string;
  dueDate: Date;
  points: number;
  type: string;
  status: 'open' | 'submitted' | 'late';
  file: string | null;
  submittedOn?: string;
  instructor: Instructor;
}

export interface Course {
  code: string;
  name: string;
  icon: string; // This will now be a Lucide icon name or component
  credits: number;
  color: string;
  instructor: string;
  room: string;
  schedule: string;
  assignments: string[];
  midterm: string;
  final: string;
}

export interface CalEvent {
  name: string;
  type: 'assign' | 'midterm' | 'exam';
  aid?: string;
  cid?: string;
}

export interface User {
  id: string;
  name: string;
  dept: string;
}
