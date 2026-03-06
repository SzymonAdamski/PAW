import { LocalStorageApi } from '../api/localStorageApi';
import type { Project } from '../types';
import { projectService } from './projectService';

export interface ActiveProjectState {
  projectId: string | null;
}

const api = new LocalStorageApi<ActiveProjectState>('active-project');

export class ActiveProjectService {
  private state: ActiveProjectState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): ActiveProjectState {
    const existing = api.getItem();

    if (existing) {
      return existing;
    }

    const initialState: ActiveProjectState = {
      projectId: null,
    };

    api.setItem(initialState);
    return initialState;
  }

  getState(): ActiveProjectState {
    return { ...this.state };
  }

  getActiveProjectId(): string | null {
    return this.state.projectId;
  }

  getActiveProject(): Project | null {
    const projectId = this.getActiveProjectId();

    if (!projectId) {
      return null;
    }

    return projectService.getById(projectId) ?? null;
  }

  setActiveProject(projectId: string): ActiveProjectState {
    const project = projectService.getById(projectId);

    if (!project) {
      throw new Error('Projekt o podanym ID nie istnieje.');
    }

    this.state = { projectId };
    api.setItem(this.state);

    return this.getState();
  }

  clearActiveProject(): void {
    this.state = { projectId: null };
    api.setItem(this.state);
  }

  ensureActiveProjectStillExists(): void {
    const projectId = this.getActiveProjectId();

    if (!projectId) {
      return;
    }

    const exists = projectService.getById(projectId);

    if (!exists) {
      this.clearActiveProject();
    }
  }
}

export const activeProjectService = new ActiveProjectService();