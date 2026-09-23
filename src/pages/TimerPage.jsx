import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, Clock, Coffee, Repeat, Trash2 } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const playAlarm = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 4; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime + i * 0.4);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + i * 0.4 + 0.3);
      gain.gain.setValueAtTime(1.5, audioCtx.currentTime + i * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.4 + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i * 0.4);
      osc.stop(audioCtx.currentTime + i * 0.4 + 0.3);
    }
  } catch (e) { console.error(e); }
};

// ─── Session History Hook ─────────────────────────────────────────
function useSessionHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('timer_history_v1');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('timer_history_v1', JSON.stringify(history));
  }, [history]);

  const addSession = (session) => {
    setHistory(prev => [{ id: Date.now().toString(), date: new Date().toISOString(), ...session }, ...prev].slice(0, 10));
  };

  const clearHistory = () => setHistory([]);

  return { history, addSession, clearHistory };
}

// ═══════════════════════════════════════════════════════════════════
// STOPWATCH TAB
// ═══════════════════════════════════════════════════════════════════
function StopwatchTab({ onSessionEnd }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (isRunning) {
      ref.current = setInterval(() => setTime(p => p + 1), 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [isRunning]);

  const toggle = () => setIsRunning(!isRunning);
  const reset = () => {
    if (time > 0) onSessionEnd({ type: 'Stopwatch', durationSeconds: time });
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };
  const addLap = () => { if (isRunning) setLaps(prev => [time, ...prev]); };

  return (
    <div className="timer-page-content">
      <div className="timer-display-container">
        <div className="timer-display-inner">
          <div className={`timer-big-value ${isRunning ? 'running' : ''}`}>{formatTime(time)}</div>
        </div>
      </div>
      <div className="timer-page-controls">
        <button className={`timer-ctrl-btn play ${isRunning ? 'pause' : ''}`} onClick={toggle}>
          {isRunning ? <Pause size={28}/> : <Play size={28}/>}
        </button>
        {isRunning && <button className="timer-ctrl-btn lap" onClick={addLap}>Lap</button>}
        <button className="timer-ctrl-btn reset" onClick={reset}><RotateCcw size={22}/></button>
      </div>
      {laps.length > 0 && (
        <div className="laps-container card">
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Laps</h3>
          <div className="laps-list">
            {laps.map((lt, i) => (
              <div key={i} className="lap-item">
                <span className="lap-number">Lap {laps.length - i}</span>
                <span className="lap-time">{formatTime(lt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TIMER TAB
// ═══════════════════════════════════════════════════════════════════
function TimerTab({ onSessionEnd }) {
  const [inputMinutes, setInputMinutes] = useState(25);
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (isRunning) {
      ref.current = setInterval(() => {
        setTime(p => {
          if (p <= 1) {
            clearInterval(ref.current);
            setIsRunning(false);
            playAlarm();
            onSessionEnd({ type: 'Timer', durationSeconds: inputMinutes * 60 });
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [isRunning]);

  const toggle = () => {
    if (!isRunning && time === 0) setTime(inputMinutes * 60);
    setIsRunning(!isRunning);
  };
  const reset = () => { setIsRunning(false); setTime(inputMinutes * 60); };

  const totalSeconds = inputMinutes * 60;
  const progress = time / totalSeconds;
  const circumference = 2 * Math.PI * 140;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="timer-page-content">
      <div className="timer-display-container">
        <svg className="timer-ring" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="none" stroke="var(--surface-border)" strokeWidth="6" />
          <circle cx="150" cy="150" r="140" fill="none"
            stroke={time === 0 && !isRunning ? 'var(--success-color)' : 'var(--highlight-color)'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            transform="rotate(-90 150 150)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="timer-display-inner">
          {!isRunning && time === inputMinutes * 60 ? (
            <div className="timer-set-group">
              <input type="number" min="1" value={inputMinutes}
                onChange={(e) => { const v = parseInt(e.target.value) || 0; setInputMinutes(v); setTime(v * 60); }}
                className="timer-set-input" />
              <span className="timer-set-label">minutes</span>
            </div>
          ) : (
            <div className={`timer-big-value ${isRunning ? 'running' : ''} ${time === 0 ? 'finished' : ''}`}>{formatTime(time)}</div>
          )}
        </div>
      </div>
      <div className="timer-page-controls">
        <button className={`timer-ctrl-btn play ${isRunning ? 'pause' : ''}`} onClick={toggle}>
          {isRunning ? <Pause size={28}/> : <Play size={28}/>}
        </button>
        <button className="timer-ctrl-btn reset" onClick={reset}><RotateCcw size={22}/></button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// POMODORO TAB
// ═══════════════════════════════════════════════════════════════════
// States: setup → working → work-wait → resting → rest-wait → (loop or completed)
function PomodoroTab({ onSessionEnd }) {
  const [workMin, setWorkMin] = useState(25);
  const [restMin, setRestMin] = useState(5);
  const [reps, setReps] = useState(''); // '' = infinite
  const [phase, setPhase] = useState('setup'); // setup | working | work-wait | resting | rest-wait | completed
  const [time, setTime] = useState(0);
  const [currentRep, setCurrentRep] = useState(1);
  const [waitElapsed, setWaitElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalWorkDone, setTotalWorkDone] = useState(0);
  const [totalWastedTime, setTotalWastedTime] = useState(0);

  const timerRef = useRef(null);
  const waitRef = useRef(null);

  const totalReps = reps === '' ? Infinity : parseInt(reps) || Infinity;
  const isInfinite = totalReps === Infinity;

  // Main countdown ticker
  useEffect(() => {
    if ((phase === 'working' || phase === 'resting') && !isPaused) {
      timerRef.current = setInterval(() => {
        setTime(p => {
          if (p <= 1) {
            clearInterval(timerRef.current);
            playAlarm();
            if (phase === 'working') {
              setTotalWorkDone(prev => prev + workMin * 60);
              setPhase('work-wait');
            } else {
              setPhase('rest-wait');
            }
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, isPaused]);

  // Wait elapsed ticker
  useEffect(() => {
    if (phase === 'work-wait' || phase === 'rest-wait') {
      setWaitElapsed(0);
      waitRef.current = setInterval(() => {
        setWaitElapsed(p => p + 1);
        setTotalWastedTime(p => p + 1);
      }, 1000);
    } else {
      clearInterval(waitRef.current);
      setWaitElapsed(0);
    }
    return () => clearInterval(waitRef.current);
  }, [phase]);

  const startPomodoro = () => {
    setCurrentRep(1);
    setTotalWorkDone(0);
    setTotalWastedTime(0);
    setTime(workMin * 60);
    setPhase('working');
    setIsPaused(false);
  };

  const startRest = () => {
    setTime(restMin * 60);
    setPhase('resting');
  };

  const startNextWork = () => {
    const nextRep = currentRep + 1;
    if (!isInfinite && nextRep > totalReps) {
      onSessionEnd({ type: 'Pomodoro', durationSeconds: totalWorkDone, detail: `${currentRep} cycles, ${formatTime(totalWastedTime)} wasted` });
      setPhase('completed');
      return;
    }
    setCurrentRep(nextRep);
    setTime(workMin * 60);
    setPhase('working');
  };

  const stopPomodoro = () => {
    clearInterval(timerRef.current);
    clearInterval(waitRef.current);
    if (totalWorkDone > 0 || (phase === 'working' && time < workMin * 60)) {
      const partial = phase === 'working' ? (workMin * 60 - time) : 0;
      onSessionEnd({ type: 'Pomodoro', durationSeconds: totalWorkDone + partial, detail: `${currentRep} cycles, ${formatTime(totalWastedTime)} wasted` });
    }
    setPhase('setup');
    setIsPaused(false);
  };

  const togglePause = () => setIsPaused(!isPaused);

  // Ring
  const currentTotal = phase === 'working' || phase === 'work-wait' ? workMin * 60 : restMin * 60;
  const progress = currentTotal > 0 ? time / currentTotal : 0;
  const circumference = 2 * Math.PI * 140;
  const dashOffset = circumference * (1 - progress);
  const ringColor = phase === 'working' ? 'var(--highlight-color)' : phase === 'resting' ? 'var(--success-color)' : 'var(--surface-border)';

  if (phase === 'setup') {
    return (
      <div className="timer-page-content">
        <div className="pomo-setup card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Coffee size={18}/> Pomodoro Setup</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Work (min)</label>
              <input type="number" min="1" className="form-input" value={workMin} onChange={e => setWorkMin(parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Rest (min)</label>
              <input type="number" min="1" className="form-input" value={restMin} onChange={e => setRestMin(parseInt(e.target.value) || 1)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cycles</label>
              <input type="number" min="1" className="form-input" value={reps} onChange={e => setReps(e.target.value)} placeholder="∞" />
            </div>
          </div>
          <button className="btn" style={{ width: '100%', marginTop: '1rem' }} onClick={startPomodoro}>
            <Play size={16}/> Start Pomodoro
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="timer-page-content">
        <div className="pomo-complete card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>All Done!</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div className="stat-box" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Work</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatTime(totalWorkDone)}</div>
            </div>
            <div className="stat-box" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cycles</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentRep}</div>
            </div>
            <div className="stat-box" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Wasted Time (Waiting)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-color)' }}>{formatTime(totalWastedTime)}</div>
            </div>
          </div>
          <button className="btn" onClick={() => setPhase('setup')}><RotateCcw size={16}/> New Session</button>
        </div>
      </div>
    );
  }

  const isWaiting = phase === 'work-wait' || phase === 'rest-wait';
  const phaseLabel = phase === 'working' ? 'WORK' : phase === 'resting' ? 'REST' : phase === 'work-wait' ? 'BREAK TIME' : 'NEXT CYCLE';

  return (
    <div className="timer-page-content">
      {/* Phase badge */}
      <div className="pomo-phase-row">
        <span className={`pomo-phase-badge ${phase === 'working' || phase === 'work-wait' ? 'work' : 'rest'}`}>
          {phaseLabel}
        </span>
        <span className="pomo-cycle-label">
          Cycle {currentRep}{!isInfinite ? ` / ${totalReps}` : ''}
        </span>
      </div>

      {/* Display */}
      <div className="timer-display-container">
        <svg className="timer-ring" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="none" stroke="var(--surface-border)" strokeWidth="6" />
          {!isWaiting && (
            <circle cx="150" cy="150" r="140" fill="none"
              stroke={ringColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              transform="rotate(-90 150 150)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          )}
        </svg>
        <div className="timer-display-inner">
          {isWaiting ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div className="timer-big-value finished">00:00</div>
              <div className="pomo-wait-elapsed">Waiting: {formatTime(waitElapsed)}</div>
            </div>
          ) : (
            <div className={`timer-big-value ${!isPaused ? 'running' : ''}`} style={{ color: phase === 'resting' ? 'var(--success-color)' : undefined }}>
              {formatTime(time)}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="timer-page-controls">
        {isWaiting ? (
          <button className="timer-ctrl-btn play" onClick={phase === 'work-wait' ? startRest : startNextWork}>
            <Play size={28}/>
          </button>
        ) : (
          <button className={`timer-ctrl-btn play ${!isPaused ? 'pause' : ''}`} onClick={togglePause}>
            {isPaused ? <Play size={28}/> : <Pause size={28}/>}
          </button>
        )}
        <button className="timer-ctrl-btn reset" onClick={stopPomodoro}><RotateCcw size={22}/></button>
      </div>

      {/* Waiting prompt */}
      {isWaiting && (
        <div className="pomo-prompt card">
          <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
            {phase === 'work-wait' ? '☕ Time for a break!' : '💪 Ready for the next cycle?'}
          </p>
          <button className="btn" onClick={phase === 'work-wait' ? startRest : startNextWork} style={{ width: '100%' }}>
            {phase === 'work-wait' ? 'Start Rest' : 'Start Next Work Session'}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function TimerPage() {
  const [mode, setMode] = useState('stopwatch');
  const { history, addSession, clearHistory } = useSessionHistory();

  const handleSessionEnd = useCallback((session) => {
    addSession(session);
  }, []);

  return (
    <div className="app-container timer-page">
      <h1>{mode === 'stopwatch' ? 'Stopwatch' : mode === 'timer' ? 'Timer' : 'Pomodoro'}</h1>

      {/* Mode Toggle */}
      <div className="timer-mode-toggle">
        <button className={`mode-btn-lg ${mode === 'stopwatch' ? 'active' : ''}`} onClick={() => setMode('stopwatch')}>
          <Clock size={18}/> Stopwatch
        </button>
        <button className={`mode-btn-lg ${mode === 'timer' ? 'active' : ''}`} onClick={() => setMode('timer')}>
          <Timer size={18}/> Timer
        </button>
        <button className={`mode-btn-lg ${mode === 'pomodoro' ? 'active' : ''}`} onClick={() => setMode('pomodoro')}>
          <Coffee size={18}/> Pomodoro
        </button>
      </div>

      {/* Active Tab */}
      {mode === 'stopwatch' && <StopwatchTab onSessionEnd={handleSessionEnd} />}
      {mode === 'timer' && <TimerTab onSessionEnd={handleSessionEnd} />}
      {mode === 'pomodoro' && <PomodoroTab onSessionEnd={handleSessionEnd} />}

      {/* Session History */}
      <div className="session-history card" style={{ width: '100%', maxWidth: 500, marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: 0 }}>Recent Sessions</h3>
          {history.length > 0 && (
            <button className="icon-btn" onClick={clearHistory} title="Clear history"><Trash2 size={14}/></button>
          )}
        </div>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No sessions recorded yet.</p>
        ) : (
          <div className="history-list">
            {history.map(s => (
              <div key={s.id} className="history-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`history-type-badge ${s.type.toLowerCase()}`}>{s.type}</span>
                  <span className="history-duration">{formatTime(s.durationSeconds)}</span>
                </div>
                <div className="history-meta">
                  {new Date(s.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {s.detail && <span> · {s.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
