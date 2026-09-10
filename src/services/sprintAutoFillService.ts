import { ProjectFeature, Task, TeamMember, Project } from '../types';
import { timeTrackingService } from './timeTrackingService';

export const sprintAutoFillService = {
  /**
   * Generates auto-filled values for Sprint Plan (Doc #9) from features, tasks, and time tracking.
   */
  generateSprintPlanContent(
    project: Project | null,
    features: ProjectFeature[],
    tasks: Task[],
    teamMembers: TeamMember[]
  ): Record<string, any> {
    const activeTasks = tasks.filter((t) => !project || t.projectId === project.id);
    const activeFeatures = features.filter((f) => !project || f.projectId === project.id);
    const prjMembers = teamMembers.filter((m) => !project || m.projectId === project.id);

    // 1. Backlog table
    const backlogTable = activeTasks.map((t, idx) => {
      const feat = activeFeatures.find((f) => f.id === t.featureId);
      const storyCode = feat
        ? `${feat.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'ST'}-${String(idx + 1).padStart(2, '0')}`
        : `TASK-${String(idx + 1).padStart(2, '0')}`;

      const storyPoints = t.estimatedHours
        ? Math.max(1, Math.round(t.estimatedHours / 4))
        : 3;

      const mappedStatus =
        t.status === 'Verified'
          ? 'Done'
          : t.status === 'In Progress' || t.status === 'Submitted'
          ? 'In Progress'
          : 'To Do';

      return {
        story_id: storyCode,
        user_story: `${t.title} ${t.description ? `(${t.description.slice(0, 60)}...)` : ''}`,
        priority: t.priority === 'High' ? 'P0' : t.priority === 'Medium' ? 'P1' : 'P2',
        story_points: `${storyPoints} pts`,
        assignee: t.assignedToName || 'Unassigned',
        status: mappedStatus,
      };
    });

    // 2. Capacity table
    const capacityTable = prjMembers.map((member) => {
      const memberTasks = activeTasks.filter((t) => t.assignedTo === member.id);
      const totalEstimated = memberTasks.reduce((sum, t) => sum + (t.estimatedHours || 6), 0);
      const totalActualMinutes = memberTasks.reduce(
        (sum, t) => sum + (t.timeTracker?.totalWorkMinutes || Math.round((t.actualHours || 0) * 60)),
        0
      );
      const formattedActual = timeTrackingService.formatDuration(totalActualMinutes);

      return {
        team_member: `${member.name} (${member.designation || member.role})`,
        availability: '10 days (Sprint 1)',
        planned_capacity: `${totalEstimated} hrs planned (${formattedActual} logged)`,
      };
    });

    // 3. Task Execution & Timing Table
    const executionTable = activeTasks.map((t) => {
      const workMins = t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60);
      const breakMins = t.timeTracker?.totalBreakMinutes ?? 0;
      const formattedWork = timeTrackingService.formatDuration(workMins);
      const formattedBreak = timeTrackingService.formatDuration(breakMins);

      return {
        feature_name: t.featureName || 'Core Feature Module',
        task_title: t.title,
        subtask_assignee: `${t.assignedToName || 'Unassigned'} (${t.assignedToRole || 'Dev'})`,
        supervisor: `${t.assignedByName || 'Lead'} (${t.assignedByRole || 'TL'})`,
        work_duration: formattedWork,
        break_delays: formattedBreak,
        status: t.status,
      };
    });

    // 4. Submissions, Resubmissions & Remarks Audit Trail
    const auditTrailTable: Array<{
      timestamp: string;
      task_item: string;
      action_type: string;
      actor: string;
      remarks: string;
    }> = [];

    activeTasks.forEach((t) => {
      // From status transition logs
      (t.statusLogs || []).forEach((log) => {
        auditTrailTable.push({
          timestamp: log.changedAt || 'Recent',
          task_item: t.title,
          action_type:
            log.toStatus === 'Submitted'
              ? 'Submission for Review'
              : log.toStatus === 'Reopened'
              ? 'Revisions Requested / Reopened'
              : log.toStatus === 'Verified'
              ? 'Verified & Approved'
              : `Status: ${log.toStatus}`,
          actor: log.changedByName || log.changedBy || 'Supervisor / Developer',
          remarks: log.remarks || '-',
        });
      });

      // From current submission if present and not in log
      if (t.submission && (!t.statusLogs || t.statusLogs.length === 0)) {
        auditTrailTable.push({
          timestamp: t.submission.submittedAt || 'Recent',
          task_item: t.title,
          action_type: 'Deliverables Submitted',
          actor: t.submission.submittedByName || t.assignedToName || 'Developer',
          remarks: t.submission.notes || 'Deliverables submitted for review',
        });
      }
    });

    // 5. Sprint goal from features
    const primaryFeature = activeFeatures[0];
    const sprintGoal = primaryFeature
      ? `Deliver ${primaryFeature.name}: Complete architectural modules (${primaryFeature.technology || 'Core Platform'}) with full verification.`
      : 'Deliver Phase 1 core deliverables and pass CTO/PM verification gates.';

    return {
      sprint_number: 'Sprint 1',
      sprint_duration: '2 Weeks (14 Days)',
      sprint_goal: sprintGoal,
      scrum_master: project?.pmName || 'PM / Team Lead',
      backlog_table: backlogTable.length > 0 ? backlogTable : undefined,
      capacity_table: capacityTable.length > 0 ? capacityTable : undefined,
      execution_table: executionTable.length > 0 ? executionTable : undefined,
      audit_trail_table: auditTrailTable.length > 0 ? auditTrailTable : undefined,
    };
  },
};

