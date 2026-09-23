import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

export default function TaskForm({ onAddTask, tabs, onCreateTab }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tabId, setTabId] = useState('');
  
  const [timerMode, setTimerMode] = useState('countdown'); // 'datetime', 'countdown'
  const [dueDate, setDueDate] = useState('');
  
  const [cdHours, setCdHours] = useState('');
  const [cdMinutes, setCdMinutes] = useState('');

  const handleTabChange = (e) => {
    if (e.target.value === 'CREATE_NEW') {
      const newName = window.prompt("Enter new category name:");
      if (newName && newName.trim()) {
        const newTabId = onCreateTab(newName.trim());
        setTabId(newTabId);
      }
    } else {
      setTabId(e.target.value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalDueTime = null;
    if (timerMode === 'datetime') {
      if (!dueDate) {
        alert("Please select a due date and time.");
        return;
      }
      finalDueTime = new Date(dueDate).getTime();
    } else if (timerMode === 'countdown') {
      const h = parseInt(cdHours) || 0;
      const m = parseInt(cdMinutes) || 0;
      if (h <= 0 && m <= 0) {
        alert("Please enter a valid countdown time (greater than 0).");
        return;
      }
      finalDueTime = Date.now() + (h * 60 * 60 * 1000) + (m * 60 * 1000);
    }
    
    const activeTab = tabId || (tabs.length > 0 ? tabs[0].id : 'default');
    
    onAddTask({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      tabId: activeTab,
      dueTime: finalDueTime,
      completed: false,
      proofImage: null
    });
    
    setTitle('');
    setDescription('');
    setDueDate('');
    setCdHours('');
    setCdMinutes('');
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Add New Task</h2>
      
      <div className="form-group">
        <label className="form-label" htmlFor="taskTitle">Task Name</label>
        <input 
          id="taskTitle"
          type="text" 
          className="form-input" 
          placeholder="e.g. Reply to client emails"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="taskDesc">Description (Optional)</label>
        <textarea 
          id="taskDesc"
          className="form-input" 
          placeholder="In-depth details about this task..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="taskGroup">Category</label>
        <select 
          id="taskGroup"
          className="form-input"
          value={tabId}
          onChange={handleTabChange}
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>{tab.name}</option>
          ))}
          <option value="CREATE_NEW" style={{ fontWeight: 'bold' }}>+ Create New Category</option>
        </select>
      </div>
      
      <div className="form-group">
        <label className="form-label">Timer Mode (Required)</label>
        <select 
          className="form-input"
          value={timerMode}
          onChange={(e) => setTimerMode(e.target.value)}
        >
          <option value="countdown">Countdown</option>
          <option value="datetime">Due Date & Time</option>
        </select>
      </div>

      {timerMode === 'datetime' && (
        <div className="form-group">
          <label className="form-label">Select Date & Time</label>
          <input 
            type="datetime-local" 
            className="form-input" 
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
      )}

      {timerMode === 'countdown' && (
        <div className="form-group">
          <label className="form-label">Time Remaining</label>
          <div className="countdown-wedge">
            <input 
              type="number" 
              min="0"
              placeholder="0"
              value={cdHours}
              onChange={(e) => setCdHours(e.target.value)}
            />
            <span>hrs</span>
            <input 
              type="number" 
              min="0"
              placeholder="0"
              value={cdMinutes}
              onChange={(e) => setCdMinutes(e.target.value)}
            />
            <span>mins</span>
          </div>
        </div>
      )}
      
      <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.75rem' }}>
        <PlusCircle size={18} /> Add Task
      </button>
    </form>
  );
}
