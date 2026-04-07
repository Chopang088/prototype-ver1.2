/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  Home, 
  Calendar as CalendarIcon, 
  Sparkles, 
  User as UserIcon, 
  Bell, 
  HelpCircle, 
  Timer, 
  ClipboardList, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Database, 
  Calculator, 
  FileText, 
  Ruler, 
  Globe, 
  Paperclip, 
  LogOut, 
  ChevronRight, 
  ChevronLeft,
  Eye,
  EyeOff,
  Send,
  Plus,
  X,
  Search,
  Check,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ASSIGNMENTS_DEFAULT, COURSES, CAL_EVENTS, UNIVERSITY_DB } from './data';
import { Assignment, Course, User } from './types';

import { handleMockApi } from '../lib/mockApiHandler';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Icon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'Database': return <Database className={className} />;
    case 'Settings': return <Settings className={className} />;
    case 'Calculator': return <Calculator className={className} />;
    case 'FileText': return <FileText className={className} />;
    case 'Ruler': return <Ruler className={className} />;
    case 'Globe': return <Globe className={className} />;
    default: return <BookOpen className={className} />;
  }
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<'login' | 'dashboard' | 'courses' | 'calendar' | 'submitted' | 'profile' | 'ai' | 'assign-detail' | 'course-detail'>('login');
  const [backPage, setBackPage] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(ASSIGNMENTS_DEFAULT);
  const [currentAssignId, setCurrentAssignId] = useState<string>('a1');
  const [currentCourseId, setCurrentCourseId] = useState<string>('cs301');
  const [calMonth, setCalMonth] = useState(1); // February (0-indexed is 1 here for simplicity with data)
  const [calYear, setCalYear] = useState(2026);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [modals, setModals] = useState<Record<string, boolean>>({});
  const [selFile, setSelFile] = useState<string | null>(null);
  const [quickAddTab, setQuickAddTab] = useState<'assign' | 'note'>('assign');
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{ id: string; prev: Assignment } | null>(null);

  const TODAY = new Date(2026, 1, 19);

  // Auth Logic
  const doLogin = (id: string, pass: string) => {
    const student = UNIVERSITY_DB[id];
    if (student && student.password === pass) {
      setUser(student);
      setCurrentPage('dashboard');
    } else {
      setToast({ message: 'Invalid Student ID or Password', type: 'error' });
    }
  };

  const doLogout = () => {
    setUser(null);
    setCurrentPage('login');
    setModals({});
  };

  const doUndoSubmission = () => {
    if (!lastSubmission) return;
    setAssignments(prev => ({ ...prev, [lastSubmission.id]: lastSubmission.prev }));
    setLastSubmission(null);
    showToast('Submission undone', 'info');
  };

  // Navigation
  const gotoPage = (page: any) => setCurrentPage(page);
  const gotoAssign = (aid: string, from: string = 'dashboard', courseId?: string) => {
    setCurrentAssignId(aid);
    setBackPage(from);
    if (courseId) setCurrentCourseId(courseId);
    setCurrentPage('assign-detail');
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), type === 'success' ? 5000 : 3000);
  };

  const toggleModal = (id: string, show: boolean) => {
    setModals(prev => ({ ...prev, [id]: show }));
    if (id === 'quickadd' && !show) {
      setQuickAddSuccess(false);
    }
  };

  // Quick Add Logic
  const [qaTitle, setQaTitle] = useState('');
  const [qaCourse, setQaCourse] = useState('CS301');
  const [qaDue, setQaDue] = useState('2026-02-19');

  const doQuickAddAssignment = () => {
    if (!qaTitle) {
      showToast('Please enter assignment title', 'error');
      return;
    }
    const newId = 'qa_' + Date.now();
    const dueDate = new Date(qaDue);
    const COURSE_NAMES: Record<string, string> = { CS301: 'Database Systems', SE201: 'Software Engineering', CS401: 'Algorithms', ENG101: 'English for Tech', MATH301: 'Discrete Math', NET201: 'Computer Networks' };
    
    const newAssign: Assignment = {
      id: newId,
      title: qaTitle,
      course: qaCourse,
      courseName: COURSE_NAMES[qaCourse] || qaCourse,
      due: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dueDate,
      points: 100,
      type: 'Homework',
      status: 'open',
      file: null,
      instructor: { name: 'Instructor', title: 'Lecturer' }
    };

    setAssignments(prev => ({ ...prev, [newId]: newAssign }));
    setQuickAddSuccess(true);
    setQaTitle('');
    setTimeout(() => {
      toggleModal('quickadd', false);
    }, 1500);
  };

  // Render Views
  return (
    <div className="min-h-screen bg-bg font-sans selection:bg-primary/20">
      <AnimatePresence mode="wait">
        {currentPage === 'login' ? (
          <LoginView onLogin={doLogin} />
        ) : (
          <div key="app" className="pb-20">
            <Header 
              title={currentPage === 'dashboard' ? 'StudyFlow' : currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} 
              user={user} 
              onProfile={() => gotoPage('profile')}
              onBack={currentPage === 'assign-detail' || currentPage === 'course-detail' ? () => {
                if (currentPage === 'assign-detail') {
                  if (backPage === 'course') setCurrentPage('course-detail');
                  else setCurrentPage(backPage as any);
                } else {
                  setCurrentPage('courses');
                }
              } : undefined}
              backLabel={currentPage === 'assign-detail' ? (backPage === 'course' ? 'Course' : 'Home') : 'Courses'}
            />
            
            <main className="max-w-xl mx-auto px-4 pt-20">
              {currentPage === 'dashboard' && <DashboardView assignments={assignments} onAssign={gotoAssign} onQuickAdd={() => toggleModal('quickadd', true)} />}
              {currentPage === 'courses' && <CoursesView assignments={assignments} onCourse={(id) => { setCurrentCourseId(id); setCurrentPage('course-detail'); }} />}
              {currentPage === 'calendar' && <CalendarView calMonth={calMonth} calYear={calYear} setCalMonth={setCalMonth} setCalYear={setCalYear} onAssign={gotoAssign} onCourse={(id) => { setCurrentCourseId(id); setCurrentPage('course-detail'); }} />}
              {currentPage === 'submitted' && <SubmittedView assignments={assignments} onAssign={gotoAssign} />}
              {currentPage === 'profile' && <ProfileView user={user} assignments={assignments} onLogout={() => toggleModal('logout', true)} onPage={gotoPage} />}
              {currentPage === 'assign-detail' && (
                <AssignDetailView 
                  assignment={assignments[currentAssignId]} 
                  onFileSelect={setSelFile} 
                  selFile={selFile} 
                  onSubmit={() => toggleModal('submit', true)} 
                  lastSubmission={lastSubmission}
                  onUndo={doUndoSubmission}
                />
              )}
              {currentPage === 'course-detail' && <CourseDetailView course={COURSES[currentCourseId]} assignments={assignments} onAssign={gotoAssign} />}
              {currentPage === 'ai' && <AIChatView user={user} assignments={assignments} />}
            </main>

            <BottomNav active={currentPage} onNavigate={gotoPage} />
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modal show={modals['logout']} onClose={() => toggleModal('logout', false)}>
        <h3 className="text-lg font-display font-bold mb-1">Sign Out?</h3>
        <p className="text-sm text-text-muted mb-6">You'll be returned to the login screen.</p>
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-bg rounded-xl font-semibold" onClick={() => toggleModal('logout', false)}>Stay</button>
          <button className="flex-1 py-3 bg-danger text-white rounded-xl font-semibold" onClick={doLogout}>Sign Out</button>
        </div>
      </Modal>

      <Modal show={modals['submit']} onClose={() => toggleModal('submit', false)}>
        <h3 className="text-lg font-display font-bold mb-1">Confirm Submission</h3>
        <p className="text-sm text-text-muted mb-6">Submit "{selFile}" for this assignment?</p>
        <div className="flex gap-3">
          <button className="flex-1 py-3 bg-bg rounded-xl font-semibold" onClick={() => toggleModal('submit', false)}>Cancel</button>
          <button className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold" onClick={() => {
            const prevAssign = assignments[currentAssignId];
            setLastSubmission({ id: currentAssignId, prev: prevAssign });
            
            setAssignments(prev => ({
              ...prev,
              [currentAssignId]: { ...prev[currentAssignId], status: 'submitted', submittedOn: 'Feb 19, 2026', file: selFile }
            }));
            setSelFile(null);
            toggleModal('submit', false);
            showToast('Assignment submitted!', 'success');
          }}>Submit</button>
        </div>
      </Modal>

      <Modal show={modals['quickadd']} onClose={() => toggleModal('quickadd', false)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-bold">Quick Add</h3>
          {quickAddSuccess && <span className="text-success font-bold flex items-center gap-1"><CheckCircle size={16} /> Done</span>}
        </div>
        
        <div className="flex gap-2 mb-6">
          <button 
            className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-colors", quickAddTab === 'assign' ? "bg-primary text-white" : "bg-bg text-text-muted")}
            onClick={() => setQuickAddTab('assign')}
          >
            Assignment
          </button>
          <button 
            className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition-colors", quickAddTab === 'note' ? "bg-primary text-white" : "bg-bg text-text-muted")}
            onClick={() => setQuickAddTab('note')}
          >
            Note
          </button>
        </div>

        {quickAddTab === 'assign' ? (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Title</label>
              <input 
                type="text" 
                className="w-full bg-bg border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                placeholder="e.g. Database HW4"
                value={qaTitle}
                onChange={e => setQaTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Course</label>
              <select 
                className="w-full bg-bg border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors appearance-none"
                value={qaCourse}
                onChange={e => setQaCourse(e.target.value)}
              >
                {Object.values(COURSES).map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 block">Due Date</label>
              <input 
                type="date" 
                className="w-full bg-bg border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                value={qaDue}
                onChange={e => setQaDue(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="flex-1 py-3 bg-bg rounded-xl font-semibold" onClick={() => toggleModal('quickadd', false)}>Cancel</button>
              <button className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold" onClick={doQuickAddAssignment}>Add Assignment</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center py-8 text-text-muted italic">Notes feature coming soon...</p>
            <button className="w-full py-3 bg-bg rounded-xl font-semibold" onClick={() => toggleModal('quickadd', false)}>Close</button>
          </div>
        )}
      </Modal>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 50, opacity: 0, x: '-50%' }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-semibold shadow-lg z-[1000] whitespace-nowrap flex items-center gap-2",
              toast.type === 'success' ? "bg-success text-white" : toast.type === 'error' ? "bg-danger text-white" : "bg-text text-white"
            )}
          >
            {toast.type === 'success' && <CheckCircle size={16} />}
            {toast.type === 'error' && <AlertTriangle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-Views ---

function LoginView({ onLogin }: { onLogin: (id: string, pass: string) => void }) {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin(id, pass);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <div className="w-20 h-20 bg-white/15 backdrop-blur-md border border-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <GraduationCap size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-display font-bold text-white">StudyFlow</h1>
        <p className="text-white/60 text-sm mt-1">Your academic companion</p>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
      >
        <h2 className="text-xl font-display font-bold text-text mb-1">Welcome back</h2>
        <p className="text-sm text-text-muted mb-6">Sign in with your university credentials</p>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Student ID</label>
            <input 
              type="text" 
              className="w-full bg-bg border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
              placeholder="e.g. 6500000001"
              value={id}
              onChange={e => setId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Password</label>
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"} 
                className="w-full bg-bg border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors pr-12"
                placeholder="Enter your password"
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
              <button 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button 
            className="w-full bg-primary text-white py-4 rounded-xl font-display font-bold text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
            onClick={handleSubmit}
          >
            Sign In
          </button>
        </div>

        <div className="mt-6 text-center text-[11px] text-text-muted leading-relaxed">
          Demo accounts:<br />
          <span className="font-bold text-primary">6500000001</span> / password123 &nbsp;·&nbsp; 
          <span className="font-bold text-primary">6500000002</span> / abcd1234
        </div>
      </motion.div>

      {loading && (
        <div className="fixed inset-0 bg-primary z-[100] flex flex-col items-center justify-center">
          <GraduationCap size={48} className="text-white animate-bounce" />
          <p className="text-white font-display font-semibold mt-4">Signing you in...</p>
        </div>
      )}
    </div>
  );
}

function Header({ title, user, onProfile, onBack, backLabel }: { title: string; user: User | null; onProfile: () => void; onBack?: () => void; backLabel?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-50 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-1 text-primary font-bold text-sm">
            <ChevronLeft size={20} />
            {backLabel}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <GraduationCap className="text-primary" size={24} />
            <span className="font-display font-bold text-lg">{title}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-muted">
          <HelpCircle size={18} />
        </button>
        <button className="text-text-muted relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
        </button>
        <button 
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs"
          onClick={onProfile}
        >
          {user?.name?.[0].toUpperCase() || '?'}
        </button>
      </div>
    </header>
  );
}

function BottomNav({ active, onNavigate }: { active: string; onNavigate: (id: any) => void }) {
  const items = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
    { id: 'ai', icon: Sparkles, label: 'AI Chat' },
    { id: 'courses', icon: BookOpen, label: 'Courses' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border h-20 flex items-center justify-around px-2 z-50 pb-safe">
      {items.map(item => (
        <button 
          key={item.id}
          className={cn(
            "flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all relative",
            active === item.id ? "text-primary" : "text-text-muted"
          )}
          onClick={() => onNavigate(item.id)}
        >
          {active === item.id && (
            <motion.div layoutId="nav-active" className="absolute top-0 w-6 h-0.5 bg-primary rounded-full" />
          )}
          <item.icon size={22} strokeWidth={active === item.id ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function DashboardView({ assignments, onAssign, onQuickAdd }: { assignments: Record<string, Assignment>; onAssign: (id: string) => void; onQuickAdd: () => void }) {
  const TODAY = new Date(2026, 1, 19);
  const openAssigns = Object.values(assignments)
    .filter(a => a.status === 'open')
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-display font-bold">Hi, Student</h2>
        <p className="text-sm text-text-muted">Semester 2 / 2026 · 18 credits</p>
      </section>

      <button 
        onClick={onQuickAdd}
        className="w-full bg-bg border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-between text-text-muted hover:border-primary transition-colors"
      >
        <span className="flex items-center gap-2"><Plus size={18} /> Quick add assignment...</span>
        <span className="text-[10px] bg-border px-2 py-1 rounded font-bold">CMD+K</span>
      </button>

      <section>
        <h3 className="text-sm font-display font-bold mb-3 flex items-center gap-2"><Timer size={18} className="text-primary" /> Countdown</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex-shrink-0 w-40 bg-primary text-white p-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Due Soon</p>
            <p className="text-2xl font-display font-bold">2 <span className="text-sm font-normal">days</span></p>
            <p className="text-[11px] mt-2 opacity-90 line-clamp-1">Database HW3</p>
          </div>
          <div className="flex-shrink-0 w-40 bg-accent text-white p-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Upcoming</p>
            <p className="text-2xl font-display font-bold">5 <span className="text-sm font-normal">days</span></p>
            <p className="text-[11px] mt-2 opacity-90 line-clamp-1">SE Report</p>
          </div>
          <div className="flex-shrink-0 w-40 bg-info text-white p-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Midterm</p>
            <p className="text-2xl font-display font-bold">12 <span className="text-sm font-normal">days</span></p>
            <p className="text-[11px] mt-2 opacity-90 line-clamp-1">CS301 Midterm</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-display font-bold mb-3 flex items-center gap-2"><ClipboardList size={18} className="text-primary" /> Assignments</h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {openAssigns.slice(0, 5).map((a, i) => {
            const d = Math.ceil((a.dueDate.getTime() - TODAY.getTime()) / 86400000);
            return (
              <div 
                key={a.id} 
                className={cn("flex items-center gap-3 cursor-pointer group", i < 4 && "border-b border-border pb-4")}
                onClick={() => onAssign(a.id)}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", d <= 3 ? "bg-danger" : "bg-warning")} />
                <div className="flex-1 min-width-0">
                  <p className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">{a.title}</p>
                  <p className="text-[11px] text-text-muted">{a.course} · Due {a.due}</p>
                </div>
                <div className={cn("text-[10px] font-bold px-2 py-1 rounded-full", d <= 3 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")}>
                  {d <= 0 ? 'Overdue' : `${d}d left`}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CoursesView({ assignments, onCourse }: { assignments: Record<string, Assignment>; onCourse: (id: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-primary rounded-2xl p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-bold">Semester 2</h2>
          <p className="text-xs opacity-70 mt-1">Academic Year 2025–2026</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-bold">6</div>
          <p className="text-[10px] uppercase font-bold opacity-60">Courses</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(COURSES).map(([id, c]) => {
          const pending = c.assignments.filter(aid => assignments[aid]?.status === 'open').length;
          return (
            <div 
              key={id} 
              className="bg-white rounded-2xl p-4 shadow-sm relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => onCourse(id)}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: c.color }} />
              <div className="mb-3 text-primary">
                <Icon name={c.icon} className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{c.code}</p>
              <h4 className="font-display font-bold text-sm leading-tight mt-1 line-clamp-2">{c.name}</h4>
              <p className="text-[11px] text-text-muted mt-2">{c.credits} Credits</p>
              <div className={cn("text-[10px] font-bold mt-2", pending > 0 ? "text-danger" : "text-success")}>
                {pending > 0 ? `${pending} pending` : 'All done'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({ calMonth, calYear, setCalMonth, setCalYear, onAssign, onCourse }: any) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const TODAY = new Date(2026, 1, 19);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  const changeMonth = (dir: number) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
  };

  const days = [];
  // Prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(<div key={`p-${i}`} className="aspect-square flex items-center justify-center text-text-light text-sm">{prevMonthDays - i}</div>);
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const k = `${calYear}-${calMonth}-${d}`;
    const ev = CAL_EVENTS[k] || [];
    const isToday = d === TODAY.getDate() && calMonth === TODAY.getMonth() && calYear === TODAY.getFullYear();
    
    days.push(
      <div 
        key={d} 
        className={cn(
          "aspect-square flex flex-col items-center justify-center text-sm font-medium rounded-full cursor-pointer relative",
          isToday ? "bg-primary text-white" : "hover:bg-primary-pale"
        )}
      >
        {d}
        <div className="flex gap-0.5 absolute bottom-1.5">
          {ev.some(e => e.type === 'assign') && <div className="w-1 h-1 rounded-full bg-warning" />}
          {ev.some(e => e.type === 'midterm') && <div className="w-1 h-1 rounded-full bg-danger" />}
          {ev.some(e => e.type === 'exam') && <div className="w-1 h-1 rounded-full bg-info" />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center" onClick={() => changeMonth(-1)}><ChevronLeft size={20} /></button>
          <h2 className="text-lg font-display font-bold">{MONTHS[calMonth]} {calYear}</h2>
          <button className="w-10 h-10 rounded-full border border-border flex items-center justify-center" onClick={() => changeMonth(1)}><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-text-muted uppercase">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] font-bold text-text-muted"><div className="w-2.5 h-2.5 rounded-full bg-warning" /> Assignment</div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-text-muted"><div className="w-2.5 h-2.5 rounded-full bg-danger" /> Midterm</div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-text-muted"><div className="w-2.5 h-2.5 rounded-full bg-info" /> Final Exam</div>
      </div>

      <section>
        <h3 className="text-sm font-display font-bold mb-3">Events in {MONTHS[calMonth]}</h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const k = `${calYear}-${calMonth}-${d}`;
            const evs = CAL_EVENTS[k] || [];
            return evs.map((e, idx) => (
              <div 
                key={`${k}-${idx}`} 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => e.aid ? onAssign(e.aid) : e.cid ? onCourse(e.cid) : null}
              >
                <div className={cn("w-3 h-3 rounded flex-shrink-0", e.type === 'midterm' ? 'bg-danger' : e.type === 'exam' ? 'bg-info' : 'bg-warning')} />
                <div className="flex-1">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{e.name}</p>
                  <p className="text-[11px] text-text-muted">{SHORT[calMonth]} {d}, {calYear}</p>
                </div>
                <ChevronRight size={16} className="text-text-light" />
              </div>
            ));
          })}
        </div>
      </section>
    </div>
  );
}

function SubmittedView({ assignments, onAssign }: { assignments: Record<string, Assignment>; onAssign: (id: string) => void }) {
  const all = Object.values(assignments);
  const sub = all.filter(a => a.status === 'submitted');
  const late = all.filter(a => a.status === 'late');
  const open = all.filter(a => a.status === 'open');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-display font-bold text-success">{sub.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase mt-1">On Time</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-display font-bold text-danger">{late.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase mt-1">Late</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-display font-bold text-primary">{open.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase mt-1">Open</p>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-display font-bold mb-3">Submissions</h3>
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          {[...sub, ...late].map((a, i, arr) => (
            <div 
              key={a.id} 
              className={cn("flex items-center gap-3 cursor-pointer group", i < arr.length - 1 && "border-b border-border pb-4")}
              onClick={() => onAssign(a.id)}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", a.status === 'late' ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
                {a.status === 'late' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
              </div>
              <div className="flex-1 min-width-0">
                <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">{a.title}</p>
                <p className="text-[11px] text-text-muted">{a.course} · {a.status === 'late' ? 'Late' : 'On time'} · {a.submittedOn}</p>
              </div>
              <div className={cn("text-[10px] font-bold px-2 py-1 rounded-full", a.status === 'late' ? "bg-danger text-white" : "bg-success text-white")}>
                {a.status === 'late' ? 'Late' : 'Done'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileView({ user, assignments, onLogout, onPage }: any) {
  const submittedCount = Object.values(assignments).filter((a: any) => a.status === 'submitted' || a.status === 'late').length;

  return (
    <div className="space-y-6">
      <div className="bg-primary rounded-3xl p-8 text-white text-center">
        <div className="w-20 h-20 bg-white/20 border-4 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
          {user?.name?.[0].toUpperCase() || '?'}
        </div>
        <h2 className="text-2xl font-display font-bold">{user?.name || 'Student'}</h2>
        <p className="text-xs opacity-70 mt-1">Student ID: {user?.id || '-'}</p>
        <p className="text-xs opacity-60 mt-1">{user?.dept || 'Engineering'}</p>
        
        <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-white/20">
          <div><p className="text-xl font-display font-bold">6</p><p className="text-[10px] opacity-60 uppercase font-bold">Courses</p></div>
          <div><p className="text-xl font-display font-bold">18</p><p className="text-[10px] opacity-60 uppercase font-bold">Credits</p></div>
          <div><p className="text-xl font-display font-bold">{submittedCount}</p><p className="text-[10px] opacity-60 uppercase font-bold">Submitted</p></div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Account</h4>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <ProfileItem icon={<UserIcon size={18} />} label="Personal Information" />
            <ProfileItem icon={<Bell size={18} />} label="Notifications" />
            <ProfileItem icon={<Globe size={18} />} label="Language" />
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Academic</h4>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <ProfileItem icon={<BookOpen size={18} />} label="My Courses" onClick={() => onPage('courses')} />
            <ProfileItem icon={<CheckCircle size={18} />} label="Submitted Assignments" onClick={() => onPage('submitted')} />
            <ProfileItem icon={<CalendarIcon size={18} />} label="Exam Schedule" onClick={() => onPage('calendar')} />
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Support</h4>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <ProfileItem icon={<HelpCircle size={18} />} label="Help & Support" />
            <ProfileItem icon={<LogOut size={18} className="text-danger" />} label="Sign Out" onClick={onLogout} danger />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button 
      className="w-full flex items-center gap-3 p-4 border-b border-border last:border-none active:bg-bg transition-colors text-left"
      onClick={onClick}
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", danger ? "bg-danger/10" : "bg-bg")}>
        {icon}
      </div>
      <span className={cn("flex-1 text-sm font-medium", danger ? "text-danger" : "text-text")}>{label}</span>
      <ChevronRight size={18} className="text-text-light" />
    </button>
  );
}

function AssignDetailView({ assignment, onFileSelect, selFile, onSubmit, lastSubmission, onUndo }: any) {
  if (!assignment) return <p>Not found</p>;
  const isS = assignment.status === 'submitted' || assignment.status === 'late';
  const d = Math.ceil((assignment.dueDate.getTime() - new Date(2026, 1, 19).getTime()) / 86400000);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-bold text-primary bg-primary-pale px-3 py-1 rounded-full">{assignment.course}</span>
          <div className={cn("text-[10px] font-bold px-3 py-1 rounded-full", isS ? "bg-success text-white" : d <= 3 ? "bg-danger text-white" : "bg-primary text-white")}>
            {isS ? 'Submitted' : d <= 0 ? 'Overdue' : `${d}d left`}
          </div>
        </div>
        <h2 className="text-xl font-display font-bold leading-tight mb-6">{assignment.title}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg p-3 rounded-xl">
            <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Due Date</p>
            <p className="text-sm font-semibold">{assignment.due}</p>
          </div>
          <div className="bg-bg p-3 rounded-xl">
            <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Points</p>
            <p className="text-sm font-semibold">{assignment.points} pts</p>
          </div>
          <div className="bg-bg p-3 rounded-xl">
            <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Type</p>
            <p className="text-sm font-semibold">{assignment.type}</p>
          </div>
          <div className="bg-bg p-3 rounded-xl">
            <p className="text-[10px] font-bold text-text-muted uppercase mb-1">Status</p>
            <p className="text-sm font-semibold capitalize">{assignment.status}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-display font-bold mb-4">Instructor</h3>
        <div className="flex items-center gap-4 bg-bg p-4 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
            {assignment.instructor.name[0]}
          </div>
          <div>
            <p className="text-sm font-bold">{assignment.instructor.name}</p>
            <p className="text-xs text-text-muted">{assignment.instructor.title}</p>
          </div>
        </div>
      </div>

      {isS ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", assignment.status === 'late' ? "bg-danger/10 text-danger" : "bg-success/10 text-success")}>
            {assignment.status === 'late' ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
          </div>
          <h3 className={cn("text-lg font-display font-bold", assignment.status === 'late' ? "text-danger" : "text-success")}>
            {assignment.status === 'late' ? 'Submitted Late' : 'Assignment Submitted!'}
          </h3>
          <p className="text-sm text-text-muted mt-1">Submitted on {assignment.submittedOn}</p>
          {assignment.file && (
            <div className="mt-4 bg-primary-pale text-primary px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2">
              <FileText size={14} /> {assignment.file}
            </div>
          )}
          {lastSubmission?.id === assignment.id && (
            <button 
              onClick={onUndo}
              className="mt-6 w-full py-3 border-2 border-border rounded-xl text-sm font-bold text-text-muted hover:bg-bg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} /> Undo Submission
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-display font-bold mb-4">Submit Assignment</h3>
          <div 
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer",
              selFile ? "border-primary bg-primary-pale" : "border-border bg-bg"
            )}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e: any) => {
                if (e.target.files[0]) onFileSelect(e.target.files[0].name);
              };
              input.click();
            }}
          >
            <Paperclip size={32} className={cn("mx-auto mb-2", selFile ? "text-primary" : "text-text-muted")} />
            <p className="text-sm text-text-muted">{selFile ? "File selected" : "Tap to choose file (PDF, DOC, ZIP)"}</p>
            {selFile && (
              <div className="mt-2">
                <p className="text-xs font-bold text-primary">{selFile}</p>
                <button 
                  className="mt-2 text-[10px] font-bold text-danger flex items-center gap-1 mx-auto bg-danger/10 px-2 py-1 rounded-full"
                  onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
                >
                  <X size={12} /> Cancel selection
                </button>
              </div>
            )}
          </div>
          <button 
            className="w-full bg-primary text-white py-4 rounded-xl font-display font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selFile}
            onClick={onSubmit}
          >
            Submit Assignment
          </button>
        </div>
      )}
    </div>
  );
}

function CourseDetailView({ course, assignments, onAssign }: any) {
  const [tab, setTab] = useState('assignments');
  const courseAssigns = course.assignments.map((id: string) => assignments[id]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 text-white" style={{ backgroundColor: course.color }}>
        <Icon name={course.icon} className="w-8 h-8 mb-2" />
        <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{course.code}</p>
        <h2 className="text-2xl font-display font-bold mt-1">{course.name}</h2>
        <p className="text-sm opacity-80 mt-2">{course.schedule} · {course.room}</p>
        <div className="flex gap-6 mt-6 pt-6 border-t border-white/20">
          <div><p className="text-xl font-display font-bold">{course.assignments.length}</p><p className="text-[10px] opacity-60 uppercase font-bold">Assignments</p></div>
          <div><p className="text-xl font-display font-bold">{course.credits}</p><p className="text-[10px] opacity-60 uppercase font-bold">Credits</p></div>
          <div><p className="text-xl font-display font-bold">{course.room}</p><p className="text-[10px] opacity-60 uppercase font-bold">Room</p></div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl shadow-sm">
        {['assignments', 'exams', 'info'].map(t => (
          <button 
            key={t}
            className={cn("flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all", tab === t ? "bg-primary text-white" : "text-text-muted")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        {tab === 'assignments' && (
          <div className="space-y-4">
            {courseAssigns.map((a: any, i: number) => (
              <div 
                key={a.id} 
                className={cn("flex items-center gap-3 cursor-pointer group", i < courseAssigns.length - 1 && "border-b border-border pb-4")}
                onClick={() => onAssign(a.id)}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", a.status === 'submitted' ? "bg-success" : "bg-warning")} />
                <div className="flex-1">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{a.title}</p>
                  <p className="text-[11px] text-text-muted">Due {a.due} · {a.points}pts</p>
                </div>
                <div className={cn("text-[10px] font-bold px-2 py-1 rounded-full", a.status === 'submitted' ? "bg-success/10 text-success" : "bg-primary/10 text-primary")}>
                  {a.status === 'submitted' ? 'Done' : 'Open'}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'exams' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-danger" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Midterm Exam</p>
                <p className="text-[11px] text-text-muted">{course.midterm} · {course.room}</p>
              </div>
              <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-1 rounded-full">Midterm</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded bg-info" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Final Exam</p>
                <p className="text-[11px] text-text-muted">{course.final} · TBD</p>
              </div>
              <span className="text-[10px] font-bold bg-info/10 text-info px-2 py-1 rounded-full">Final</span>
            </div>
          </div>
        )}
        {tab === 'info' && (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Instructor</p><p className="text-sm font-semibold">{course.instructor}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Credits</p><p className="text-sm font-semibold">{course.credits}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Room</p><p className="text-sm font-semibold">{course.room}</p></div>
            <div><p className="text-[10px] font-bold text-text-muted uppercase mb-1">Schedule</p><p className="text-sm font-semibold">{course.schedule}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIChatView({ user, assignments }: any) {
  const [messages, setMessages] = useState<any[]>([{role: 'assistant', content: "สวัสดีครับ มีอะไรให้ช่วยไหม?"}]);
  const [input, setInput] = useState('');
  const handleSend = () => {
  console.log("Button Clicked!"); // ใส่ไว้เช็คใน Console ว่าฟังก์ชันทำงานไหม
  if (!inputValue.trim()) return;

  const botReply = handleMockApi(inputValue);
  
  setMessages(prev => [
    ...prev,
    { role: 'user', content: inputValue },
    { role: 'assistant', content: botReply }
  ]);
  
  setInputValue('');
};
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);


  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary-pale text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-lg font-display font-bold">StudyFlow AI</h3>
            <p className="text-sm text-text-muted mt-2">Ask me about your assignments, courses, or study tips!</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", m.role === 'user' ? "bg-primary text-white" : "bg-accent text-white")}>
                {m.role === 'user' ? <UserIcon size={16} /> : <Sparkles size={16} />}
              </div>
              <div className={cn("max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed", m.role === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white shadow-sm border border-border rounded-tl-none")}>
                {m.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <textarea 
          className="flex-1 bg-white border-2 border-border rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none"
          placeholder="Ask anything..."
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <button 
          className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          onClick={handleSend}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

// --- Generic Components ---

function Modal({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-6 sm:hidden" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
