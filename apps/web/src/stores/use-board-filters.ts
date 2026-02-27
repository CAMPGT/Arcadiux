import { create } from 'zustand';
import type { IssueType, PriorityLevel } from '@arcadiux/shared/constants';

interface BoardFiltersState {
  sprintFilter: string | null;
  assigneeFilter: string | null;
  typeFilter: IssueType | null;
  priorityFilter: PriorityLevel | null;
  searchText: string;
  setSprintFilter: (sprintId: string | null) => void;
  setAssigneeFilter: (assigneeId: string | null) => void;
  setTypeFilter: (type: IssueType | null) => void;
  setPriorityFilter: (priority: PriorityLevel | null) => void;
  setSearchText: (text: string) => void;
  clearFilters: () => void;
}

export const useBoardFilters = create<BoardFiltersState>((set) => ({
  sprintFilter: null,
  assigneeFilter: null,
  typeFilter: null,
  priorityFilter: null,
  searchText: '',
  setSprintFilter: (sprintId) => set({ sprintFilter: sprintId }),
  setAssigneeFilter: (assigneeId) => set({ assigneeFilter: assigneeId }),
  setTypeFilter: (type) => set({ typeFilter: type }),
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),
  setSearchText: (text) => set({ searchText: text }),
  clearFilters: () =>
    set({
      sprintFilter: null,
      assigneeFilter: null,
      typeFilter: null,
      priorityFilter: null,
      searchText: '',
    }),
}));
