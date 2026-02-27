'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { Issue, Sprint } from '@arcadiux/shared/types';
import type { IssueType } from '@arcadiux/shared/constants';
import { cn, getIssueKey } from '@/lib/utils';
import { useGanttTimeline } from '@/hooks/use-gantt-timeline';
import type { ZoomLevel } from '@/lib/gantt-utils';
import { getDayWidth } from '@/lib/gantt-utils';
import { GanttTimelineHeader } from './gantt-timeline-header';
import { GanttBar, GanttMarker } from './gantt-bar';
import { GanttRowLabel } from './gantt-row-label';
import { GanttTodayMarker } from './gantt-today-marker';
import { GanttNoDatesList } from './gantt-no-dates-list';

interface EpicGroup {
  epic: Issue | null; // null = "Sin Épica"
  children: Issue[];
}

interface GanttChartProps {
  issues: Issue[];
  sprint: Sprint | null;
  projectKey: string;
  zoom: ZoomLevel;
  onResize: (issueId: string, newStart: Date, newEnd: Date) => void;
  onIssueClick: (issueId: string) => void;
}

const ROW_HEIGHT = 40; // h-10

export function GanttChart({
  issues,
  sprint,
  projectKey,
  zoom,
  onResize,
  onIssueClick,
}: GanttChartProps) {
  const timeline = useGanttTimeline(issues, sprint, zoom);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  // Group issues by epic
  const { groups, datelessIssues } = useMemo(() => {
    const epics = issues.filter((i) => i.type === 'epic');
    const nonEpics = issues.filter((i) => i.type !== 'epic');

    const epicMap = new Map<string, Issue>();
    epics.forEach((e) => epicMap.set(e.id, e));

    // Group children by epicId
    const childrenByEpic = new Map<string, Issue[]>();
    const orphans: Issue[] = [];

    nonEpics.forEach((issue) => {
      if (issue.epicId && epicMap.has(issue.epicId)) {
        const list = childrenByEpic.get(issue.epicId) ?? [];
        list.push(issue);
        childrenByEpic.set(issue.epicId, list);
      } else {
        orphans.push(issue);
      }
    });

    const groups: EpicGroup[] = [];

    // Add epic groups
    epics.forEach((epic) => {
      groups.push({
        epic,
        children: childrenByEpic.get(epic.id) ?? [],
      });
    });

    // Add orphans group
    if (orphans.length > 0) {
      groups.push({ epic: null, children: orphans });
    }

    // Separate dateless issues (no startDate AND no endDate)
    const dateless: Issue[] = [];
    const withDates: Issue[] = [];
    issues.forEach((i) => {
      if (!i.startDate && !i.endDate) {
        dateless.push(i);
      } else {
        withDates.push(i);
      }
    });

    return { groups, datelessIssues: dateless };
  }, [issues]);

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  // Build rows
  const rows = useMemo(() => {
    const result: {
      issue: Issue;
      indent: boolean;
      isGroup: boolean;
      isExpanded: boolean;
      groupKey: string;
    }[] = [];

    groups.forEach((group) => {
      const groupKey = group.epic?.id ?? '__no_epic__';
      const isExpanded = expandedEpics[groupKey] !== false; // default expanded

      if (group.epic) {
        result.push({
          issue: group.epic,
          indent: false,
          isGroup: true,
          isExpanded,
          groupKey,
        });
      } else if (group.children.length > 0) {
        // "Sin Épica" header — use first child as proxy (we'll handle label in render)
        result.push({
          issue: group.children[0],
          indent: false,
          isGroup: true,
          isExpanded,
          groupKey,
        });
      }

      if (isExpanded) {
        group.children.forEach((child) => {
          result.push({
            issue: child,
            indent: !!group.epic,
            isGroup: false,
            isExpanded: false,
            groupKey,
          });
        });
      }
    });

    return result;
  }, [groups, expandedEpics]);

  const dayWidth = getDayWidth(zoom);
  const totalHeight = rows.length * ROW_HEIGHT;

  // Generate weekend shading columns
  const weekendShading = useMemo(() => {
    if (zoom !== 'day') return null;
    return timeline.columns
      .filter((col) => col.isWeekend)
      .map((col, i) => {
        const x = timeline.dateToX(col.date);
        return (
          <div
            key={`weekend-${i}`}
            className="absolute top-0 h-full bg-muted/30"
            style={{ left: x, width: dayWidth }}
          />
        );
      });
  }, [timeline, zoom, dayWidth]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: labels */}
        <div className="w-64 shrink-0 border-r bg-background">
          {/* Header */}
          <div className="flex h-[33px] items-center border-b bg-muted/50 px-3">
            <span className="text-[10px] font-medium text-muted-foreground">Issue</span>
          </div>
          {/* Rows */}
          <div className="overflow-y-auto" style={{ height: totalHeight }}>
            {rows.map((row, i) => {
              const isNoEpicHeader = row.isGroup && row.groupKey === '__no_epic__';
              const key = isNoEpicHeader
                ? '__no_epic_header__'
                : row.issue.id + (row.isGroup ? '-group' : '');

              if (isNoEpicHeader) {
                return (
                  <div
                    key={key}
                    className="flex h-10 items-center gap-1.5 border-b bg-muted/20 px-2 text-sm"
                  >
                    <button
                      onClick={() => toggleEpic('__no_epic__')}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
                    >
                      {row.isExpanded ? (
                        <span className="text-xs">▼</span>
                      ) : (
                        <span className="text-xs">▶</span>
                      )}
                    </button>
                    <span className="text-xs font-medium text-muted-foreground">
                      Sin Épica
                    </span>
                  </div>
                );
              }

              return (
                <GanttRowLabel
                  key={key}
                  issueKey={getIssueKey(projectKey, row.issue.issueNumber)}
                  title={row.issue.title}
                  type={row.issue.type as IssueType}
                  indent={row.indent}
                  isGroup={row.isGroup}
                  isExpanded={row.isExpanded}
                  onToggle={() => toggleEpic(row.groupKey)}
                  onClick={() => onIssueClick(row.issue.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Right panel: timeline */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
        >
          <div style={{ width: timeline.totalWidthPx, minWidth: '100%' }}>
            {/* Timeline header */}
            <GanttTimelineHeader columns={timeline.columns} zoom={zoom} />

            {/* Timeline body */}
            <div
              className="relative"
              style={{ height: totalHeight, width: timeline.totalWidthPx }}
            >
              {/* Weekend shading */}
              {weekendShading}

              {/* Grid lines (row separators) */}
              {rows.map((_, i) => (
                <div
                  key={`gridline-${i}`}
                  className="absolute w-full border-b border-border/30"
                  style={{ top: (i + 1) * ROW_HEIGHT }}
                />
              ))}

              {/* Today marker */}
              {timeline.todayX !== null && (
                <GanttTodayMarker x={timeline.todayX} height={totalHeight} />
              )}

              {/* Bars */}
              {rows.map((row, i) => {
                const issue = row.issue;
                const isNoEpicHeader = row.isGroup && row.groupKey === '__no_epic__';
                if (isNoEpicHeader) return null;

                const hasBothDates = issue.startDate && issue.endDate;
                const hasOneDate = !hasBothDates && (issue.startDate || issue.endDate);

                if (hasBothDates) {
                  let start = issue.startDate!;
                  let end = issue.endDate!;
                  // Swap if inverted
                  if (start > end) {
                    [start, end] = [end, start];
                  }

                  return (
                    <div
                      key={`bar-${issue.id}`}
                      className="absolute"
                      style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, width: '100%' }}
                    >
                      <GanttBar
                        issueId={issue.id}
                        issueKey={getIssueKey(projectKey, issue.issueNumber)}
                        type={issue.type as IssueType}
                        startDateStr={start}
                        endDateStr={end}
                        timelineStart={timeline.timelineStart}
                        timelineEnd={timeline.timelineEnd}
                        dayWidthPx={timeline.dayWidthPx}
                        onResize={onResize}
                        onClick={() => onIssueClick(issue.id)}
                      />
                    </div>
                  );
                }

                if (hasOneDate) {
                  const dateStr = issue.startDate ?? issue.endDate!;
                  return (
                    <div
                      key={`marker-${issue.id}`}
                      className="absolute"
                      style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, width: '100%' }}
                    >
                      <GanttMarker
                        dateStr={dateStr}
                        type={issue.type as IssueType}
                        timelineStart={timeline.timelineStart}
                        dayWidthPx={timeline.dayWidthPx}
                        onClick={() => onIssueClick(issue.id)}
                      />
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dateless issues */}
      <GanttNoDatesList
        issues={datelessIssues}
        projectKey={projectKey}
        onIssueClick={onIssueClick}
      />
    </div>
  );
}
