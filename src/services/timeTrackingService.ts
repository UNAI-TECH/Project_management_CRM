import { supabaseClient } from '../lib/supabaseClient';
import { TaskTimeLog, TaskTimeTracker, Task } from '../types';

export const timeTrackingService = {
  async getTimeLogs(taskId?: string, employeeId?: string): Promise<TaskTimeLog[]> {
    let query = supabaseClient
      .from('task_time_logs')
      .select('*')
      .order('timestamp', { ascending: true });

    if (taskId) {
      query = query.eq('task_id', taskId);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not fetch task_time_logs:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      employeeId: row.employee_id,
      employeeName: row.employee_name || 'Employee',
      action: row.action as any,
      timestamp: row.timestamp,
      notes: row.notes || undefined,
    }));
  },

  async logAction(
    taskId: string,
    employeeId: string,
    employeeName: string,
    action: 'begin' | 'end' | 'break_start' | 'break_end' | 'pause',
    notes?: string
  ): Promise<TaskTimeLog> {
    const newLog = {
      task_id: taskId,
      employee_id: employeeId,
      employee_name: employeeName,
      action,
      notes: notes || null,
      timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from('task_time_logs')
      .insert(newLog)
      .select()
      .single();

    if (error) {
      console.error('Error logging task time action:', error);
      throw error;
    }

    // Auto-update task progress/status based on action
    if (action === 'begin') {
      await supabaseClient
        .from('tasks')
        .update({
          status: 'In Progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    } else if (action === 'end') {
      // Recompute total hours
      const allLogs = await this.getTimeLogs(taskId);
      const tracker = this.computeTrackerFromLogs(taskId, allLogs);
      await supabaseClient
        .from('tasks')
        .update({
          actual_hours: Number((tracker.totalWorkMinutes / 60).toFixed(2)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    }

    return {
      id: data.id,
      taskId: data.task_id,
      employeeId: data.employee_id,
      employeeName: data.employee_name,
      action: data.action,
      timestamp: data.timestamp,
      notes: data.notes || undefined,
    };
  },

  computeTrackerFromLogs(
    taskId: string,
    logs: TaskTimeLog[],
    dueDate?: string
  ): TaskTimeTracker {
    const taskLogs = logs.filter((l) => l.taskId === taskId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let totalWorkMs = 0;
    let totalBreakMs = 0;
    let currentWorkStart: number | null = null;
    let currentBreakStart: number | null = null;
    let isActive = false;
    let startedAt: string | undefined = undefined;

    taskLogs.forEach((l) => {
      const timeMs = new Date(l.timestamp).getTime();

      if (l.action === 'begin') {
        if (!startedAt) startedAt = l.timestamp;
        currentWorkStart = timeMs;
        isActive = true;
      } else if (l.action === 'break_start') {
        if (currentWorkStart) {
          totalWorkMs += timeMs - currentWorkStart;
          currentWorkStart = null;
        }
        currentBreakStart = timeMs;
        isActive = false;
      } else if (l.action === 'break_end') {
        if (currentBreakStart) {
          totalBreakMs += timeMs - currentBreakStart;
          currentBreakStart = null;
        }
        currentWorkStart = timeMs;
        isActive = true;
      } else if (l.action === 'end' || l.action === 'pause') {
        if (currentWorkStart) {
          totalWorkMs += timeMs - currentWorkStart;
          currentWorkStart = null;
        }
        if (currentBreakStart) {
          totalBreakMs += timeMs - currentBreakStart;
          currentBreakStart = null;
        }
        isActive = false;
      }
    });

    // If currently running, add delta from workStart to now
    if (isActive && currentWorkStart) {
      totalWorkMs += Date.now() - currentWorkStart;
    } else if (currentBreakStart) {
      totalBreakMs += Date.now() - currentBreakStart;
    }

    // Overdue calculations
    let isOverdue = false;
    let overdueMinutes = 0;
    if (dueDate) {
      const parsedDueDate = new Date(dueDate.split('/').reverse().join('-') + 'T23:59:59').getTime();
      if (!isNaN(parsedDueDate) && Date.now() > parsedDueDate) {
        isOverdue = true;
        overdueMinutes = Math.round((Date.now() - parsedDueDate) / 60000);
      }
    }

    return {
      taskId,
      totalWorkMinutes: Math.round(totalWorkMs / 60000),
      totalBreakMinutes: Math.round(totalBreakMs / 60000),
      isActive,
      startedAt,
      lastActivityAt: taskLogs[taskLogs.length - 1]?.timestamp,
      isOverdue,
      overdueMinutes,
      timeLogs: taskLogs,
    };
  },

  getOverdueSeverity(dueDate?: string, status?: string): {
    severity: 'none' | 'today' | 'warning' | 'critical';
    label: string;
    cardClasses: string;
    badgeClasses: string;
  } {
    if (status === 'Verified') {
      return {
        severity: 'none',
        label: 'Completed',
        cardClasses: 'bg-white border-slate-200',
        badgeClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }

    if (!dueDate) {
      return {
        severity: 'none',
        label: 'No Due Date',
        cardClasses: 'bg-white border-slate-200',
        badgeClasses: 'bg-slate-100 text-slate-600 border-slate-200',
      };
    }

    // Parse DD/MM/YYYY or YYYY-MM-DD
    const dateStr = dueDate.includes('/')
      ? dueDate.split('/').reverse().join('-')
      : dueDate;
    const dueTime = new Date(`${dateStr}T23:59:59`).getTime();
    if (isNaN(dueTime)) {
      return {
        severity: 'none',
        label: dueDate,
        cardClasses: 'bg-white border-slate-200',
        badgeClasses: 'bg-slate-100 text-slate-600 border-slate-200',
      };
    }

    const now = Date.now();
    const diffHours = (dueTime - now) / (1000 * 60 * 60);

    if (diffHours < -72) {
      // 3+ days overdue
      return {
        severity: 'critical',
        label: `Overdue by ${Math.abs(Math.round(diffHours / 24))}d`,
        cardClasses: 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-300/50 shadow-rose-100',
        badgeClasses: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      };
    }

    if (diffHours < 0) {
      // 1-3 days overdue
      return {
        severity: 'warning',
        label: `Overdue by ${Math.abs(Math.round(diffHours))}h`,
        cardClasses: 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40 shadow-amber-100',
        badgeClasses: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      };
    }

    if (diffHours <= 24) {
      // Due today
      return {
        severity: 'today',
        label: 'Due Today',
        cardClasses: 'bg-yellow-50/50 border-yellow-300',
        badgeClasses: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-bold',
      };
    }

    return {
      severity: 'none',
      label: `Due ${dueDate}`,
      cardClasses: 'bg-white border-slate-200 hover:border-blue-300',
      badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  },

  formatDuration(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  },
};
