import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CheckSquare, Trash2 } from 'lucide-react';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import TimeTracker from '../components/TimeTracker';

const DEFAULT_TABS = [
  { id: 't-1', name: 'General' },
  { id: 't-2', name: 'Emails' },
  { id: 't-3', name: 'Calls' }
];

export default function TaskManager() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('tasks_v4');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('tabs_v4');
    return saved ? JSON.parse(saved) : DEFAULT_TABS;
  });
  
  const [activeTabIds, setActiveTabIds] = useState(() => {
    return tabs.length > 0 ? [tabs[0].id] : [];
  });
  
  const [rightTab, setRightTab] = useState('completed'); // 'completed', 'archived', 'deleted'
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    localStorage.setItem('tasks_v4', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tabs_v4', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
      
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio context failed", e);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTasks(prevTasks => {
        let updated = false;
        const newTasks = prevTasks.map(task => {
          if (!task.completed && task.dueTime && task.dueTime <= now && !task.notified) {
            updated = true;
            if (notificationPermission === 'granted') {
              try {
                new Notification('Task Overdue!', { 
                  body: `Your task "${task.title}" has become overdue!`, 
                  icon: '/vite.svg' 
                });
              } catch(e) {}
            }
            playAlertSound();
            return { ...task, notified: true };
          }
          return task;
        });
        return updated ? newTasks : prevTasks;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [notificationPermission]);

  const handleAddTask = (newTask) => {
    const taskWithAttachments = { ...newTask, attachments: [], proofImage: null };
    setTasks([taskWithAttachments, ...tasks]);
    if (!activeTabIds.includes(newTask.tabId)) {
      toggleTab(newTask.tabId);
    }
  };
  
  const handleEditTask = (id, updates) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleToggleComplete = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleArchiveTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, archived: true } : t));
  };

  const handleDeleteTask = (id) => {
    if (window.confirm("Move this task to the deleted tab?")) {
      setTasks(tasks.map(t => t.id === id ? { ...t, deleted: true } : t));
    }
  };

  const handleRestoreTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, deleted: false } : t));
  };

  // Adds a single attachment {type, name, data} to a task's attachments array
  const handleAddAttachment = (id, attachment) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        const newAttachments = [...(t.attachments || []), attachment];
        return { ...t, attachments: newAttachments };
      });

      // --- Duplicate detection ---
      // Build map of attachment data -> list of task ids that have it
      const dataToTaskIds = {};
      updated.forEach(t => {
        (t.attachments || []).forEach(a => {
          if (!a.data) return;
          if (!dataToTaskIds[a.data]) dataToTaskIds[a.data] = new Set();
          dataToTaskIds[a.data].add(t.id);
        });
      });

      // Find any attachment data that appears in > 3 tasks
      const flagged = Object.entries(dataToTaskIds).filter(([, ids]) => ids.size > 3);
      if (flagged.length > 0) {
        const count = flagged[0][1].size;
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('⚠️ Duplicate Attachment Detected', { body: `The same attachment appears in ${count} tasks and has been flagged.` }); } catch(e) {}
        }
        alert(`⚠️ Duplicate Attachment Detected\nThis attachment is shared across ${count} tasks. All affected tasks have been flagged.`);
      }

      return updated;
    });
  };

  const handleCreateTab = (name) => {
    const newTab = { id: `t-${Date.now()}`, name };
    setTabs(prev => [...prev, newTab]);
    toggleTab(newTab.id);
    return newTab.id;
  };

  const handleAddTab = () => {
    const name = window.prompt("Enter new tab name:");
    if (name && name.trim()) {
      handleCreateTab(name.trim());
    }
  };

  const handleEditTab = (id) => {
    const tab = tabs.find(t => t.id === id);
    const newName = window.prompt("Rename tab:", tab.name);
    if (newName && newName.trim()) {
      setTabs(tabs.map(t => t.id === id ? { ...t, name: newName.trim() } : t));
    }
  };

  const handleDeleteTab = (id) => {
    if (tabs.length <= 1) {
      alert("You must have at least one category remaining.");
      return;
    }
    if (window.confirm("Delete this category? Tasks inside will be moved to another tab.")) {
      const remainingTabs = tabs.filter(t => t.id !== id);
      setTabs(remainingTabs);
      
      const fallbackId = remainingTabs[0].id;
      setTasks(tasks.map(t => t.tabId === id ? { ...t, tabId: fallbackId } : t));
      
      setActiveTabIds(prev => {
        const next = prev.filter(tId => tId !== id);
        return next.length > 0 ? next : [fallbackId];
      });
    }
  };

  const toggleTab = (id) => {
    setActiveTabIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; 
        return prev.filter(tId => tId !== id);
      } else {
        if (prev.length >= 2) {
          return [prev[1], id]; 
        }
        return [...prev, id];
      }
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      handleEditTask(taskId, { tabId: targetTabId });
    }
  };

  const handleToggleFlag = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, manualFlag: !t.manualFlag } : t));
  };

  // Sort helper: manually flagged first, then by dueTime ascending
  const sortTasks = (arr) => [...arr].sort((a, b) => {
    if (a.manualFlag && !b.manualFlag) return -1;
    if (!a.manualFlag && b.manualFlag) return 1;
    return (a.dueTime || Infinity) - (b.dueTime || Infinity);
  });

  const uncompletedTasks = tasks.filter(t => !t.completed && !t.deleted);
  const completedUnarchivedTasks = tasks.filter(t => t.completed && !t.archived && !t.deleted);
  const archivedTasks = tasks.filter(t => t.completed && t.archived && !t.deleted);
  const deletedTasks = tasks.filter(t => t.deleted);
  const overdueTasks = sortTasks(uncompletedTasks.filter(t => t.dueTime && t.dueTime < Date.now()));

  // Count of manually-flagged uncompleted tasks per tab
  const flagCountByTab = {};
  uncompletedTasks.forEach(t => {
    if (t.manualFlag) flagCountByTab[t.tabId] = (flagCountByTab[t.tabId] || 0) + 1;
  });

  // Compute which task IDs have duplicate attachments across >3 tasks
  const duplicateTaskIds = (() => {
    const dataToTaskIds = {};
    tasks.forEach(t => {
      (t.attachments || []).forEach(a => {
        if (!a.data) return;
        if (!dataToTaskIds[a.data]) dataToTaskIds[a.data] = new Set();
        dataToTaskIds[a.data].add(t.id);
      });
    });
    const flaggedIds = new Set();
    Object.values(dataToTaskIds).forEach(ids => {
      if (ids.size > 3) ids.forEach(id => flaggedIds.add(id));
    });
    return flaggedIds;
  })();

  return (
    <div className="app-container">
      <TimeTracker />
      <h1>Task Manager</h1>
      
      {notificationPermission !== 'granted' && (
        <div className="notification-banner">
          <p style={{ marginBottom: '0.5rem' }}>Enable browser notifications to get alerts when backgrounded.</p>
          <button className="btn btn-secondary" onClick={requestNotificationPermission} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
            Enable Notifications
          </button>
        </div>
      )}

      <div className="main-layout">
        
        {/* LEFT COLUMN: Add Form */}
        <div className="left-panel">
          <TaskForm 
            onAddTask={handleAddTask} 
            tabs={tabs} 
            onCreateTab={handleCreateTab}
          />
        </div>
        
        {/* MIDDLE COLUMN: Multi-Tab Active Tasks */}
        <div className="middle-panel">
          
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <div className="column-header" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
                Overdue Tasks
              </div>
              <div className="task-grid-container" style={{ gridTemplateColumns: '1fr' }}>
                <div className="task-list-column">
                  {overdueTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      tabs={tabs}
                      onToggleComplete={handleToggleComplete}
                      onAddAttachment={handleAddAttachment}
                      onEditTask={handleEditTask}
                      onToggleFlag={handleToggleFlag}
                      onDeleteTask={handleDeleteTask}
                      isDuplicate={duplicateTaskIds.has(task.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="tabs-container">
            {tabs.map(tab => {
              const isActive = activeTabIds.includes(tab.id);
              const flagCount = flagCountByTab[tab.id] || 0;
              return (
                <div 
                  key={tab.id} 
                  className={`tab ${isActive ? 'active' : ''}`}
                  onClick={() => toggleTab(tab.id)}
                  style={{ position: 'relative' }}
                >
                  {isActive && <CheckSquare size={14} />}
                  {tab.name}
                  {flagCount > 0 && (
                    <span className="tab-flag-badge">{flagCount}</span>
                  )}
                  {isActive && (
                    <div style={{ display: 'flex', gap: '0.1rem', marginLeft: '0.25rem' }}>
                      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEditTab(tab.id); }} title="Rename Tab" style={{ padding: '2px', color: 'inherit' }}>
                        <Edit2 size={12} />
                      </button>
                      {tabs.length > 1 && (
                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDeleteTab(tab.id); }} title="Delete Tab" style={{ padding: '2px', color: 'inherit' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <button className="add-tab-btn" onClick={handleAddTab}>
              <Plus size={14} /> New Tab
            </button>
          </div>

          <div 
            className="task-grid-container" 
            style={{ gridTemplateColumns: activeTabIds.length === 2 ? '1fr 1fr' : '1fr' }}
          >
            {activeTabIds.map(tabId => {
              const tab = tabs.find(t => t.id === tabId);
              if (!tab) return null;
              const tabTasks = sortTasks(uncompletedTasks.filter(t => t.tabId === tabId));
              
              return (
                <div 
                  key={tabId} 
                  className="task-list-column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, tabId)}
                  style={{ minHeight: '200px', border: '1px dashed transparent', borderRadius: 'var(--border-radius-lg)', paddingBottom: '2rem' }}
                >
                  <div className="column-header">{tab.name}</div>
                  {tabTasks.length === 0 ? (
                    <div className="card empty-state" style={{ opacity: 0.7 }}>
                      <p>Drag tasks here or add a new one.</p>
                    </div>
                  ) : (
                    tabTasks.map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        tabs={tabs}
                        onToggleComplete={handleToggleComplete}
                        onAddAttachment={handleAddAttachment}
                        onEditTask={handleEditTask}
                        onToggleFlag={handleToggleFlag}
                        onDeleteTask={handleDeleteTask}
                        isDuplicate={duplicateTaskIds.has(task.id)}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Completed / Archived Tasks */}
        <div className="right-panel">
          <div className="right-panel-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)' }}>
            <button 
              className={`tab-btn ${rightTab === 'completed' ? 'active' : ''}`} 
              onClick={() => setRightTab('completed')}
              style={{ background: 'none', border: 'none', padding: '0.5rem', fontWeight: rightTab === 'completed' ? 'bold' : 'normal', color: rightTab === 'completed' ? 'var(--text-color)' : 'var(--text-secondary)', borderBottom: rightTab === 'completed' ? '2px solid var(--success-color)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Completed Tasks
            </button>
            <button 
              className={`tab-btn ${rightTab === 'archived' ? 'active' : ''}`} 
              onClick={() => setRightTab('archived')}
              style={{ background: 'none', border: 'none', padding: '0.5rem', fontWeight: rightTab === 'archived' ? 'bold' : 'normal', color: rightTab === 'archived' ? 'var(--text-color)' : 'var(--text-secondary)', borderBottom: rightTab === 'archived' ? '2px solid var(--text-secondary)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Archive
            </button>
            <button 
              className={`tab-btn ${rightTab === 'deleted' ? 'active' : ''}`} 
              onClick={() => setRightTab('deleted')}
              style={{ background: 'none', border: 'none', padding: '0.5rem', fontWeight: rightTab === 'deleted' ? 'bold' : 'normal', color: rightTab === 'deleted' ? 'var(--text-color)' : 'var(--text-secondary)', borderBottom: rightTab === 'deleted' ? '2px solid var(--danger-color)' : '2px solid transparent', cursor: 'pointer' }}
            >
              Deleted
            </button>
          </div>
          <div className="task-list-column">
            {rightTab === 'completed' && (
              completedUnarchivedTasks.length === 0 ? (
                <div className="card empty-state">
                  <p>Check off a task to see it here.</p>
                </div>
              ) : (
                completedUnarchivedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    tabs={tabs}
                    onToggleComplete={handleToggleComplete}
                    onAddAttachment={handleAddAttachment}
                    onEditTask={handleEditTask}
                    onToggleFlag={handleToggleFlag}
                    onArchiveTask={handleArchiveTask}
                    onDeleteTask={handleDeleteTask}
                    isMinimal={true}
                    isDuplicate={duplicateTaskIds.has(task.id)}
                  />
                ))
              )
            )}
            {rightTab === 'archived' && (
              archivedTasks.length === 0 ? (
                <div className="card empty-state">
                  <p>No archived tasks.</p>
                </div>
              ) : (
                archivedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    tabs={tabs}
                    onToggleComplete={handleToggleComplete}
                    onAddAttachment={handleAddAttachment}
                    onEditTask={handleEditTask}
                    onToggleFlag={handleToggleFlag}
                    onDeleteTask={handleDeleteTask}
                    isMinimal={true}
                    isDuplicate={duplicateTaskIds.has(task.id)}
                  />
                ))
              )
            )}
            {rightTab === 'deleted' && (
              deletedTasks.length === 0 ? (
                <div className="card empty-state">
                  <p>No deleted tasks.</p>
                </div>
              ) : (
                deletedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    tabs={tabs}
                    onToggleComplete={handleToggleComplete}
                    onAddAttachment={handleAddAttachment}
                    onEditTask={handleEditTask}
                    onToggleFlag={handleToggleFlag}
                    onRestoreTask={handleRestoreTask}
                    isMinimal={true}
                    isDuplicate={duplicateTaskIds.has(task.id)}
                  />
                ))
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

