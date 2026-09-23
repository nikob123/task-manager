import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Save, Trash2, Plus } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Computer Science',
  'Economics',
  'Psychology',
  'Literature',
];

export default function StudyLog() {
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('study_logs_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [customSubjects, setCustomSubjects] = useState(() => {
    const saved = localStorage.getItem('custom_subjects_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Chart controls
  const [chartView, setChartView] = useState('date'); // 'date' | 'subject'
  const [chartRange, setChartRange] = useState(7);    // days
  const [chartSubjectFilter, setChartSubjectFilter] = useState('all'); // 'all' | specific subject

  const allSubjects = [...DEFAULT_SUBJECTS, ...customSubjects].sort();

  useEffect(() => {
    localStorage.setItem('study_logs_v1', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('custom_subjects_v1', JSON.stringify(customSubjects));
  }, [customSubjects]);

  const handleAddSubject = () => {
    const name = newSubjectInput.trim();
    if (!name) return;
    if (allSubjects.includes(name)) {
      alert('Subject already exists!');
      return;
    }
    setCustomSubjects(prev => [...prev, name]);
    setSubject(name);
    setNewSubjectInput('');
    setShowAddSubject(false);
  };

  const handleSaveLog = (e) => {
    e.preventDefault();
    if (!subject || !duration) return;
    
    const newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      subject,
      durationMinutes: parseInt(duration),
      notes: notes.trim()
    };
    
    setLogs([newLog, ...logs]);
    setSubject('');
    setDuration('');
    setNotes('');
  };

  const handleDeleteLog = (id) => {
    setLogs(logs.filter(log => log.id !== id));
  };

  // Filter logs by date range
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - chartRange);
  cutoff.setHours(0,0,0,0);

  const filteredLogs = logs.filter(log => new Date(log.date) >= cutoff);

  // Further filter by subject if a specific one is selected
  const chartLogs = chartSubjectFilter === 'all'
    ? filteredLogs
    : filteredLogs.filter(l => l.subject === chartSubjectFilter);

  // Build bar chart data: by date
  const buildBarByDate = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const data = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      data.push({ label: dateStr, minutes: 0, timestamp: d.getTime() });
    }
    chartLogs.forEach(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0,0,0,0);
      const entry = data.find(b => b.timestamp === logDate.getTime());
      if (entry) entry.minutes += log.durationMinutes;
    });
    return data;
  };

  // Build bar chart data: by subject
  const buildBarBySubject = () => {
    const subjectMap = {};
    chartLogs.forEach(log => {
      subjectMap[log.subject] = (subjectMap[log.subject] || 0) + log.durationMinutes;
    });
    return Object.entries(subjectMap)
      .map(([name, minutes]) => ({ label: name, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  };

  const barData = chartView === 'date' ? buildBarByDate() : buildBarBySubject();

  // Pie chart: subject breakdown (within the selected range + filter)
  const subjectMapForPie = {};
  filteredLogs.forEach(log => {
    subjectMapForPie[log.subject] = (subjectMapForPie[log.subject] || 0) + log.durationMinutes;
  });
  const pieData = Object.entries(subjectMapForPie)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Unique subjects present in logs (for the subject filter dropdown)
  const loggedSubjects = [...new Set(logs.map(l => l.subject))].sort();

  return (
    <div className="app-container study-log-page">
      <h1>Study Log & Analytics</h1>
      
      <div className="log-layout">
        <div className="left-panel">
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Log Study Session</h2>
            <form onSubmit={handleSaveLog}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                {showAddSubject ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={newSubjectInput}
                      onChange={e => setNewSubjectInput(e.target.value)}
                      placeholder="New subject name…"
                      autoFocus
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn" onClick={handleAddSubject} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Add</button>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowAddSubject(false); setNewSubjectInput(''); }} style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      className="form-input"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                      style={{ flex: 1 }}
                    >
                      <option value="">Select a subject…</option>
                      {allSubjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button type="button" className="icon-btn" onClick={() => setShowAddSubject(true)} title="Add new subject" style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--border-radius-sm)', padding: '0.4rem' }}>
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Minutes)</label>
                <input 
                  type="number" 
                  min="1"
                  className="form-input" 
                  value={duration} 
                  onChange={e => setDuration(e.target.value)}
                  placeholder="e.g. 45"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea 
                  className="form-input" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you cover?"
                  style={{ minHeight: '60px' }}
                />
              </div>
              <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                <Save size={16} /> Save Log
              </button>
            </form>
          </div>
          
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Logs</h2>
            {logs.length === 0 ? (
              <p className="empty-state">No logs yet. Start studying!</p>
            ) : (
              <div className="logs-list">
                {logs.map(log => (
                  <div key={log.id} className="log-item">
                    <div className="log-header">
                      <strong>{log.subject}</strong>
                      <span className="log-duration">{log.durationMinutes} min</span>
                    </div>
                    <div className="log-meta">
                      {new Date(log.date).toLocaleDateString()}
                    </div>
                    {log.notes && <div className="log-notes">{log.notes}</div>}
                    <button className="icon-btn delete-log-btn" onClick={() => handleDeleteLog(log.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="right-panel charts-panel" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Chart Controls */}
          <div className="card chart-controls-card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Chart Controls</h2>
            <div className="chart-controls">
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">View By</label>
                <div className="chart-toggle">
                  <button className={`toggle-btn ${chartView === 'date' ? 'active' : ''}`} onClick={() => setChartView('date')}>By Date</button>
                  <button className={`toggle-btn ${chartView === 'subject' ? 'active' : ''}`} onClick={() => setChartView('subject')}>By Subject</button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Time Range</label>
                <div className="chart-toggle">
                  {[7, 14, 30, 90].map(days => (
                    <button key={days} className={`toggle-btn ${chartRange === days ? 'active' : ''}`} onClick={() => setChartRange(days)}>
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Filter Subject</label>
                <select className="form-input" value={chartSubjectFilter} onChange={e => setChartSubjectFilter(e.target.value)} style={{ fontSize: '0.85rem', padding: '0.4rem' }}>
                  <option value="all">All Subjects</option>
                  {loggedSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card chart-card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center' }}>
              Study Time — {chartView === 'date' ? `Last ${chartRange} Days` : `By Subject (${chartRange}d)`}
              {chartSubjectFilter !== 'all' && ` · ${chartSubjectFilter}`}
            </h2>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval={chartRange > 14 ? Math.floor(chartRange / 7) - 1 : 0} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={60} tickFormatter={(val) => `${val} min`} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E7E1D8' }} formatter={(value) => [`${value} min`, 'Study Time']} />
                  <Bar dataKey="minutes" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="card chart-card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', textAlign: 'center' }}>Subject Breakdown (Last {chartRange} Days)</h2>
            {pieData.length === 0 ? (
              <div className="empty-state" style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No data available
              </div>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E7E1D8' }} formatter={(value) => [`${value} min`, 'Time']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
