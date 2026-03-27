export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
    id: string;
    name: string;
    description: string;
    priority: TaskPriority;
    storyId: string;
    estimatedHours: number;
    status: TaskStatus;
    assignedToId: string | null;
    workedHours: number;
    createdAt: string;
    updatedAt: string;
    startDate: string | null;
    completedAt: string | null;
}

export interface CreateTaskDTO {
    name: string;
    description: string;
    priority: TaskPriority;
    storyId: string;
    estimatedHours: number;
    status?: TaskStatus;
    assignedToId?: string | null;
    workedHours?: number;
}

export interface UpdateTaskDTO {
    name?: string;
    description?: string;
    priority?: TaskPriority;
    estimatedHours?: number;
    status?: TaskStatus;
    assignedToId?: string | null;
    workedHours?: number;
}
