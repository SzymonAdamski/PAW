export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    name: string;
    description: string;
    storyId: string;
    assignedToId: string;
    status: TaskStatus;
    startDate: string;
    workedHours: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskDTO {
    name: string;
    description: string;
    storyId: string;
    assignedToId: string;
    status?: TaskStatus;
    startDate?: string;
    workedHours?: number;
}

export interface UpdateTaskDTO {
    name?: string;
    description?: string;
    status?: TaskStatus;
    assignedToId?: string;
    workedHours?: number;
}
