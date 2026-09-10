import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskTimeTracker as ITaskTimeTracker, TaskTimeLog } from '../../types';
import { timeTrackingService } from '../../services/timeTrackingService';
import { Play, Pause, Square, Coffee, Clock, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

interface TaskTimeTrackerProps {
  task: Task;
  onLogAction: (taskId: string, action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause', notes?: string) => Promise<any>;
  readOnly?: boolean;
}

function formatStopwatch(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

function formatClockDigits(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const TaskTimeTracker: React.FC<TaskTimeTrackerProps> = ({
  task,
  onLogAction,
  readOnly = false,
}) => {
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakReason, setBreakReason] = useState('Lunch Break');
  const [customNotes, setCustomNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  const tracker: ITaskTimeTracker = task.timeTracker || {
    taskId: task.id,
    totalWorkMinutes: Math.round((task.actualHours || 0) * 60),
    totalBreakMinutes: 0,
    isActive: task.status === 'In Progress',
    isOverdue: false,
    overdueMinutes: 0,
    timeLogs: [],
  };

  const isCompleted = task.status === 'Verified';
  const isUnderReview = task.status === 'Submitted';

  // Compute exact ms breakdown from logs
  const { completedWorkMs, completedBreakMs, activeWorkStartTime, activeBreakStartTime, lastAction } = useMemo(() => {
    const logs = [...(tracker.timeLogs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let workMs = 0;
    let breakMs = 0;
    let currentWorkStart: number | null = null;
    let currentBreakStart: number | null = null;
    let lastAct: string | null = null;

    logs.forEach((l) => {
      const t = new Date(l.timestamp).getTime();
      lastAct = l.action;

      if (l.action === 'begin') {
        currentWorkStart = t;
      } else if (l.action === 'break_start') {
        if (currentWorkStart) {
          workMs += t - currentWorkStart;
          currentWorkStart = null;
        }
        currentBreakStart = t;
      } else if (l.action === 'break_end') {
        if (currentBreakStart) {
          breakMs += t - currentBreakStart;
          currentBreakStart = null;
        }
        currentWorkStart = t;
      } else if (l.action === 'end' || l.action === 'pause') {
        if (currentWorkStart) {
          workMs += t - currentWorkStart;
          currentWorkStart = null;
        }
        if (currentBreakStart) {
          breakMs += t - currentBreakStart;
          currentBreakStart = null;
        }
      }
    });

    // Fallback if no logs but task has started / active flag
    if (!currentWorkStart && tracker.isActive && logs.length === 0) {
      if (task.startedAt) {
        currentWorkStart = new Date(task.startedAt).getTime();
      } else {
        currentWorkStart = Date.now();
      }
    }

    return {
      completedWorkMs: workMs,
      completedBreakMs: breakMs,
      activeWorkStartTime: currentWorkStart,
      activeBreakStartTime: currentBreakStart,
      lastAction: lastAct,
    };
  }, [tracker.timeLogs, tracker.isActive, task.startedAt]);

  const isOnBreak = Boolean(activeBreakStartTime) || lastAction === 'break_start';
  const isRunning = Boolean(activeWorkStartTime && !isOnBreak && tracker.isActive);

  // Live interval tick every 1000ms while running or on break
  useEffect(() => {
    if (isRunning || isOnBreak) {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning, isOnBreak]);

  // Calculate live work and break seconds
  const liveWorkSeconds = useMemo(() => {
    let totalMs = completedWorkMs;
    if (isRunning && activeWorkStartTime) {
      totalMs += Math.max(0, now - activeWorkStartTime);
    }
    // If completedWorkMs is 0 but totalWorkMinutes > 0, fallback
    if (totalMs === 0 && tracker.totalWorkMinutes > 0) {
      totalMs = tracker.totalWorkMinutes * 60 * 1000;
      if (isRunning && activeWorkStartTime) {
        totalMs += Math.max(0, now - activeWorkStartTime);
      }
    }
    return Math.floor(totalMs / 1000);
  }, [completedWorkMs, isRunning, activeWorkStartTime, now, tracker.totalWorkMinutes]);

  const liveBreakSeconds = useMemo(() => {
    let totalMs = completedBreakMs;
    if (isOnBreak && activeBreakStartTime) {
      totalMs += Math.max(0, now - activeBreakStartTime);
    }
    if (totalMs === 0 && tracker.totalBreakMinutes > 0) {
      totalMs = tracker.totalBreakMinutes * 60 * 1000;
    }
    return Math.floor(totalMs / 1000);
  }, [completedBreakMs, isOnBreak, activeBreakStartTime, now, tracker.totalBreakMinutes]);

  const handleAction = async (action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause', notes?: string) => {
    setLoading(true);
    try {
      await onLogAction(task.id, action, notes);
      setNow(Date.now());
    } catch (err) {
      console.error('Time tracking error:', err);
    } finally {
      setLoading(false);
      setIsBreakModalOpen(false);
    }
  };

  const overdueInfo = timeTrackingService.getOverdueSeverity(task.dueDate, task.status);

  return (
    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/90 text-xs space-y-3 font-sans">
      {/* Header with status pill & live counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Work Duration & Timing</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>In Progress (Live: {formatClockDigits(liveWorkSeconds)})</span>
            </span>
          ) : isOnBreak ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
              <Coffee className="w-3 h-3 text-amber-600" />
              <span>On Break ({formatClockDigits(liveBreakSeconds)})</span>
            </span>
          ) : isUnderReview ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              <Clock className="w-3 h-3 text-indigo-600" />
              <span>In Review by Lead</span>
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Completed</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
              Paused / Standby
            </span>
          )}

          {overdueInfo.severity !== 'none' && !isCompleted && !isUnderReview && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${overdueInfo.badgeClasses} flex items-center gap-1`}>
              <AlertTriangle className="w-3 h-3" />
              <span>{overdueInfo.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row with live ticking values */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
        {/* Actual Working Time */}
        <div className={`p-2.5 rounded-xl border transition-all ${
          isRunning 
            ? 'bg-blue-50/70 border-blue-300 shadow-xs' 
            : 'bg-white border-slate-200/80 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 block text-[10px] font-semibold">Actual Working Time</span>
            {isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            )}
          </div>
          <span className="font-extrabold text-blue-700 text-sm mt-0.5 block font-mono tracking-tight">
            {formatStopwatch(liveWorkSeconds)}
          </span>
          {isRunning && (
            <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
              ● Timer Active
            </span>
          )}
        </div>

        {/* Break / Delays */}
        <div className={`p-2.5 rounded-xl border transition-all ${
          isOnBreak 
            ? 'bg-amber-50/70 border-amber-300 shadow-xs' 
            : 'bg-white border-slate-200/80 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 block text-[10px] font-semibold">Break / Delays</span>
            {isOnBreak && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            )}
          </div>
          <span className="font-extrabold text-amber-600 text-sm mt-0.5 block font-mono tracking-tight">
            {formatStopwatch(liveBreakSeconds)}
          </span>
          {isOnBreak && (
            <span className="text-[9px] text-amber-700 font-bold block mt-0.5">
              ☕ Break Active
            </span>
          )}
        </div>

        {/* Target Estimate */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-slate-400 block text-[10px] font-semibold">Estimated Target</span>
          <span className="font-bold text-slate-800 text-sm mt-0.5 block">
            {task.estimatedHours || 8}h allocated
          </span>
        </div>
      </div>

      {/* Action Buttons for Employee */}
      {!readOnly && !isCompleted && !isUnderReview && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70">
          {!isRunning && !isOnBreak && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction('begin', 'Started work')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{liveWorkSeconds > 0 ? 'Resume Task' : 'Begin Task'}</span>
            </button>
          )}

          {isRunning && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsBreakModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Take Break</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleAction('end', 'Completed work session')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Task / Pause</span>
              </button>
            </>
          )}

          {isOnBreak && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAction('break_end', 'Resumed work after break')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Work</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleAction('end', 'Paused task during break')}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Task / Pause</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Break Dialog Modal */}
      {isBreakModalOpen && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 mt-2 animate-fade-in">
          <p className="font-bold text-amber-900 text-xs">Log Break or Closing Delay</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={breakReason}
              onChange={(e) => setBreakReason(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="Lunch Break">Lunch Break</option>
              <option value="Tea / Coffee Break">Tea / Coffee Break</option>
              <option value="Internal Meeting">Internal Meeting</option>
              <option value="Closing Time / EOD">Closing Time / EOD</option>
              <option value="Blocked / Dependency Delay">Blocked / Dependency Delay</option>
            </select>

            <input
              type="text"
              placeholder="Optional remarks..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsBreakModalOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-amber-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction('break_start', `${breakReason}${customNotes ? `: ${customNotes}` : ''}`)}
              className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              Start Break
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
