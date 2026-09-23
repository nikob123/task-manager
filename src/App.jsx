import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import TaskManager from './pages/TaskManager';
import StudyLog from './pages/StudyLog';
import TimerPage from './pages/TimerPage';
import { BookOpen, ListTodo, Timer } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="top-nav">
      <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
        <ListTodo size={16} /> Tasks
      </Link>
      <Link to="/timer" className={`nav-link ${location.pathname === '/timer' ? 'active' : ''}`}>
        <Timer size={16} /> Timer
      </Link>
      <Link to="/log" className={`nav-link ${location.pathname === '/log' ? 'active' : ''}`}>
        <BookOpen size={16} /> Study Log
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<TaskManager />} />
        <Route path="/timer" element={<TimerPage />} />
        <Route path="/log" element={<StudyLog />} />
      </Routes>
    </BrowserRouter>
  );
}
