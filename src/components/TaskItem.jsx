import React, { useRef, useState } from 'react';
import { Check, Clock, Edit2, Share, Save, X, ExternalLink, Minimize2, Paperclip, Link, Flag, AlertTriangle, Archive, Trash2, RotateCcw } from 'lucide-react';

export default function TaskItem({ task, tabs, onToggleComplete, onAddAttachment, onEditTask, onToggleFlag, onArchiveTask, onDeleteTask, onRestoreTask, isMinimal, isDuplicate }) {
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!isMinimal);
  const [driveUrl, setDriveUrl] = useState('');
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [editTabId, setEditTabId] = useState(task.tabId);

  const attachments = task.attachments || [];
  const hasAttachments = attachments.length > 0;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        onAddAttachment(task.id, { type: 'file', name: file.name, data: reader.result });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddDriveLink = () => {
    const url = driveUrl.trim();
    if (!url) return;
    if (!url.startsWith('http')) {
      alert('Please enter a valid URL starting with http:// or https://');
      return;
    }
    onAddAttachment(task.id, { type: 'gdrive', name: url, data: url });
    setDriveUrl('');
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onEditTask(task.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      tabId: editTabId
    });
    setIsEditing(false);
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const attachmentLines = attachments.map((a, i) =>
      a.type === 'gdrive' ? `  [${i + 1}] Google Drive: ${a.data}` : `  [${i + 1}] File: ${a.name}`
    ).join('\n') || '  None';

    const shareText = `This task was completed!! \ntitle: ${task.title}\ndescription: ${task.description || 'None'}\nproof:\n${attachmentLines}`;
    const shareData = { title: task.title, text: shareText };

    // Try to attach local image files
    const fileAttachments = attachments.filter(a => a.type === 'file' && a.data);
    if (fileAttachments.length > 0 && navigator.canShare) {
      try {
        const files = await Promise.all(fileAttachments.map(async (a, i) => {
          const res = await fetch(a.data);
          const blob = await res.blob();
          return new File([blob], a.name || `proof_${i}.png`, { type: blob.type });
        }));
        if (navigator.canShare({ files })) shareData.files = files;
      } catch (err) {
        console.error('Could not process images for sharing', err);
      }
    }

    if (navigator.share) {
      navigator.share(shareData).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareData.text);
      alert('Task details copied to clipboard!');
    }
  };

  // Opens a local base64 attachment in a new tab via a temporary blob URL
  const openAttachment = (e, a) => {
    e.stopPropagation();
    if (a.type === 'gdrive') {
      window.open(a.data, '_blank', 'noreferrer');
      return;
    }
    try {
      // Convert data: URI to blob then open it so browsers can render PDFs natively
      const [header, base64] = a.data.split(',');
      const mime = header.match(/:(.*?);/)[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noreferrer');
      // Revoke after a short delay so the tab has time to load it
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Could not open attachment', err);
    }
  };

  const isPdf = (a) => a.name && a.name.toLowerCase().endsWith('.pdf');

  const getDueString = () => {
    if (!task.dueTime) return null;
    const now = Date.now();
    const isOverdue = now > task.dueTime;
    const msDiff = task.dueTime - now;
    const isSoon = !isOverdue && msDiff < (24 * 60 * 60 * 1000);
    const dateStr = new Date(task.dueTime).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    let colorClass = '';
    if (!task.completed) {
      if (isOverdue) colorClass = 'due-danger';
      else if (isSoon) colorClass = 'due-warning';
    }
    return (
      <span className={colorClass}>
        <Clock size={14} /> {isOverdue && !task.completed ? 'Overdue: ' : 'Due: '}{dateStr}
      </span>
    );
  };

  const tabName = tabs.find(t => t.id === task.tabId)?.name || 'Unknown';

  // ── MINIMAL VIEW (completed tasks right panel) ──────────────────
  if (isMinimal && !isExpanded) {
    return (
      <div className={`task-item task-item-minimal ${isDuplicate ? 'flagged' : ''}`} onClick={() => setIsExpanded(true)}>
        {isDuplicate && (
          <div className="duplicate-flag"><AlertTriangle size={13}/> Duplicate Attachment</div>
        )}
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className="tag">{tabName}</span>
          {task.dueTime && <span><Clock size={12}/> {new Date(task.dueTime).toLocaleDateString()}</span>}
          {task.completed && !task.archived && onArchiveTask && (
            <button className="icon-btn" style={{ padding: '0.1rem' }} onClick={(e) => { e.stopPropagation(); onArchiveTask(task.id); }} title="Archive Task">
              <Archive size={12}/>
            </button>
          )}
          {onDeleteTask && (
            <button className="icon-btn" style={{ padding: '0.1rem' }} onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} title="Delete Task">
              <Trash2 size={12}/>
            </button>
          )}
          {onRestoreTask && (
            <button className="icon-btn" style={{ padding: '0.1rem' }} onClick={(e) => { e.stopPropagation(); onRestoreTask(task.id); }} title="Restore Task">
              <RotateCcw size={12}/>
            </button>
          )}
        </div>
        {hasAttachments && (
          <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {attachments.map((a, i) => (
              a.type === 'gdrive'
                ? <button key={i} type="button" className="proof-link" onClick={(e) => openAttachment(e, a)}><ExternalLink size={11}/> Drive Link</button>
                : isPdf(a)
                  ? <button key={i} type="button" className="proof-link" onClick={(e) => openAttachment(e, a)}><span className="pdf-badge" style={{ fontSize: '0.65rem' }}>PDF</span> {a.name}</button>
                  : <button key={i} type="button" className="proof-link" onClick={(e) => openAttachment(e, a)}><Paperclip size={11}/> {a.name}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── EDITING VIEW ─────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="task-item">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input type="text" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Move to Tab</label>
          <select className="form-input" value={editTabId} onChange={e => setEditTabId(e.target.value)}>
            {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={handleSave}><Save size={16}/> Save</button>
          <button className="btn btn-secondary" onClick={() => {
            setIsEditing(false);
            setEditTitle(task.title);
            setEditDesc(task.description || '');
            setEditTabId(task.tabId);
          }}><X size={16}/> Cancel</button>
        </div>
      </div>
    );
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  // ── FULL VIEW ────────────────────────────────────────────────────
  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''} ${isDuplicate ? 'flagged' : ''} ${task.manualFlag ? 'manually-flagged' : ''}`}
      draggable={!task.completed && !isEditing}
      onDragStart={!task.completed && !isEditing ? handleDragStart : undefined}
      style={{ cursor: !task.completed && !isEditing ? 'grab' : 'default' }}
    >
      {isDuplicate && (
        <div className="duplicate-flag"><AlertTriangle size={13}/> Duplicate attachment shared across 3+ tasks</div>
      )}

      <div className="task-header">
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="task-title" style={{ color: task.manualFlag ? 'var(--danger-color)' : undefined }}>
              {task.manualFlag && <Flag size={14} style={{ display: 'inline', marginRight: '0.3rem', color: 'var(--danger-color)' }}/>}
              {task.title}
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {!task.completed && onToggleFlag && (
                <button
                  className={`icon-btn${task.manualFlag ? ' icon-btn-flagged' : ''}`}
                  onClick={() => onToggleFlag(task.id)}
                  title={task.manualFlag ? 'Remove flag' : 'Flag this task'}
                >
                  <Flag size={16} />
                </button>
              )}
              {!task.completed && (
                <button className="icon-btn" onClick={() => setIsEditing(true)} title="Edit Task"><Edit2 size={16}/></button>
              )}
              {task.completed && (
                <button className="icon-btn" onClick={handleShare} title="Share Task"><Share size={16}/></button>
              )}
              {task.completed && !task.archived && onArchiveTask && (
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onArchiveTask(task.id); }} title="Archive Task">
                  <Archive size={16}/>
                </button>
              )}
              {onDeleteTask && (
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} title="Delete Task">
                  <Trash2 size={16}/>
                </button>
              )}
              {onRestoreTask && (
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onRestoreTask(task.id); }} title="Restore Task">
                  <RotateCcw size={16}/>
                </button>
              )}
              {isMinimal && isExpanded && (
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} title="Collapse"><Minimize2 size={16}/></button>
              )}
            </div>
          </div>

          {task.description && <div className="task-desc">{task.description}</div>}
          <div className="task-meta">
            <span className="tag">{tabName}</span>
            {task.dueTime && getDueString()}
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="proof-section">
        {attachments.length > 0 && (
          <div className="attachments-list">
            {attachments.map((a, i) => (
              <div key={i} className="attachment-chip">
                {a.type === 'gdrive'
                  ? <><Link size={12}/><button type="button" className="attachment-link-btn" onClick={(e) => openAttachment(e, a)}>{a.data.slice(0, 40)}…</button></>
                  : isPdf(a)
                    ? <><span className="pdf-badge">PDF</span><button type="button" className="attachment-link-btn" onClick={(e) => openAttachment(e, a)}>{a.name}</button></>
                    : <><Paperclip size={12}/><button type="button" className="attachment-link-btn" onClick={(e) => openAttachment(e, a)}>{a.name}</button></>
                }
              </div>
            ))}
            {/* Preview first local image (non-PDF) */}
            {attachments.find(a => a.type === 'file' && !isPdf(a)) && (
              <img
                src={attachments.find(a => a.type === 'file' && !isPdf(a)).data}
                alt="Proof preview"
                className="image-preview"
                style={{ cursor: 'pointer' }}
                onClick={(e) => openAttachment(e, attachments.find(a => a.type === 'file' && !isPdf(a)))}
              />
            )}
          </div>
        )}

        {!task.completed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <label className="form-label">Attach Files (images, multiple supported)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="form-input"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ fontSize: '0.8rem', padding: '0.4rem' }}
            />
            <label className="form-label">Link Google Drive File</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                className="form-input"
                placeholder="Paste Google Drive URL…"
                value={driveUrl}
                onChange={e => setDriveUrl(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddDriveLink} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                <Link size={14}/> Add Link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mark Done */}
      <div className="checkbox-container">
        <div
          className={`checkbox-custom ${task.completed ? 'checked' : ''} ${!hasAttachments && !task.completed ? 'disabled' : ''}`}
          onClick={() => { if (hasAttachments || task.completed) onToggleComplete(task.id); }}
          title={!hasAttachments && !task.completed ? 'Attach at least one file or link to mark as done' : 'Mark as done'}
        >
          {task.completed && <Check size={16} color="white"/>}
        </div>
        <span style={{ fontSize: '0.85rem', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: '500' }}>
          {task.completed ? 'Completed' : 'Mark Done'}
        </span>
      </div>
    </div>
  );
}
