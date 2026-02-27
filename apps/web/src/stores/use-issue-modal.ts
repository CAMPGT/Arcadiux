import { create } from 'zustand';

interface IssueModalState {
  isOpen: boolean;
  selectedIssueId: string | null;
  openIssue: (issueId: string) => void;
  closeIssue: () => void;
}

export const useIssueModal = create<IssueModalState>((set) => ({
  isOpen: false,
  selectedIssueId: null,
  openIssue: (issueId) => set({ isOpen: true, selectedIssueId: issueId }),
  closeIssue: () => set({ isOpen: false, selectedIssueId: null }),
}));
