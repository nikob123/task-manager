import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Clock } from 'lucide-react';

export default function TimeTracker() {
  const [mode, setMode] = useState('stopwatch'); // 'stopwatch' | 'timer'
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // in seconds
  const [inputMinutes, setInputMinutes] = useState(25);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prev => {
          if (mode === 'stopwatch') {
            return prev + 1;
          } else {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsRunning(false);
              playAlarm();
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, mode]);

  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 1);
      gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTimer = () => {
    if (!isRunning && mode === 'timer' && time === 0) {
      setTime(inputMinutes * 60);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(mode === 'timer' ? inputMinutes * 60 : 0);
  };

  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTime(newMode === 'timer' ? inputMinutes * 60 : 0);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="time-tracker card">
      <div className="tracker-header">
        <div className="mode-switches">
          <button className={`mode-btn ${mode === 'stopwatch' ? 'active' : ''}`} onClick={() => switchMode('stopwatch')}>
            <Clock size={12}/> Stopwatch
          </button>
          <button className={`mode-btn ${mode === 'timer' ? 'active' : ''}`} onClick={() => switchMode('timer')}>
            <Timer size={12}/> Timer
          </button>
        </div>
      </div>
      
      <div className="tracker-display">
        {mode === 'timer' && !isRunning && time === inputMinutes * 60 ? (
          <div className="timer-input-group">
             <input 
               type="number" 
               min="1" 
               value={inputMinutes} 
               onChange={(e) => {
                 const val = parseInt(e.target.value) || 0;
                 setInputMinutes(val);
                 setTime(val * 60);
               }}
               className="timer-input"
             />
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>min</span>
          </div>
        ) : (
          <div className={`time-value ${isRunning ? 'running' : ''}`}>{formatTime(time)}</div>
        )}
      </div>

      <div className="tracker-controls">
        <button className={`control-btn play-btn ${isRunning ? 'pause' : ''}`} onClick={toggleTimer}>
          {isRunning ? <Pause size={16}/> : <Play size={16}/>}
        </button>
        <button className="control-btn reset-btn" onClick={resetTimer} title="Reset">
          <RotateCcw size={16}/>
        </button>
      </div>
    </div>
  );
}
