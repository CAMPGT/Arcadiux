import { EventEmitter } from "node:events";

// Typed event definitions
export interface AppEvents {
  "issue.created": {
    issueId: string;
    userId: string;
    projectId: string;
  };
  "issue.updated": {
    issueId: string;
    userId: string;
    projectId: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
  };
  "issue.transitioned": {
    issueId: string;
    userId: string;
    projectId: string;
    fromStatusId: string;
    toStatusId: string;
  };
  "issue.deleted": {
    issueId: string;
    userId: string;
    projectId: string;
  };
  "comment.created": {
    issueId: string;
    userId: string;
    projectId: string;
    commentId: string;
  };
  "comment.updated": {
    issueId: string;
    userId: string;
    projectId: string;
    commentId: string;
  };
  "comment.deleted": {
    issueId: string;
    userId: string;
    projectId: string;
    commentId: string;
  };
  "sprint.started": {
    sprintId: string;
    projectId: string;
    userId: string;
  };
  "sprint.completed": {
    sprintId: string;
    projectId: string;
    userId: string;
  };
}

class TypedEventEmitter {
  private emitter = new EventEmitter();

  constructor() {
    // Increase max listeners to avoid warnings in high-traffic scenarios
    this.emitter.setMaxListeners(50);
  }

  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): boolean {
    return this.emitter.emit(event, data);
  }

  on<K extends keyof AppEvents>(
    event: K,
    handler: (data: AppEvents[K]) => void,
  ): this {
    this.emitter.on(event, handler);
    return this;
  }

  off<K extends keyof AppEvents>(
    event: K,
    handler: (data: AppEvents[K]) => void,
  ): this {
    this.emitter.off(event, handler);
    return this;
  }

  once<K extends keyof AppEvents>(
    event: K,
    handler: (data: AppEvents[K]) => void,
  ): this {
    this.emitter.once(event, handler);
    return this;
  }
}

export const eventEmitter = new TypedEventEmitter();
