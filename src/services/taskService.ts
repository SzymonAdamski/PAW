import { TaskModel } from '../models/task';
import { LocalStorageApi } from '../api/localStorageApi';
import type { CreateTaskDTO, UpdateTaskDTO, Task, TaskPriority, TaskStatus } from '../types';

const api = new LocalStorageApi<Task>('tasks');

function normalizeTaskStatus(status: unknown): TaskStatus {
    if (status === 'in-progress') {
        return 'doing';
    }

    if (status === 'todo' || status === 'doing' || status === 'done') {
        return status;
    }

    return 'todo';
}

function normalizeTaskPriority(priority: unknown): TaskPriority {
    if (priority === 'low' || priority === 'medium' || priority === 'high') {
        return priority;
    }

    return 'medium';
}

function maybeIsoDate(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
}

function normalizeTask(raw: Partial<Task>): Task {
    const now = new Date().toISOString();
    let status = normalizeTaskStatus(raw.status);

    let assignedToId: string | null = typeof raw.assignedToId === 'string' && raw.assignedToId.trim().length > 0
        ? raw.assignedToId
        : null;

    let startDate = maybeIsoDate(raw.startDate);
    let completedAt = maybeIsoDate(raw.completedAt);

    if (status === 'doing') {
        if (!assignedToId) {
            status = 'todo';
            startDate = null;
        } else if (!startDate) {
            startDate = raw.updatedAt ?? raw.createdAt ?? now;
        }

        completedAt = null;
    }

    if (status === 'done') {
        if (!assignedToId) {
            status = 'todo';
            startDate = null;
            completedAt = null;
        } else {
            if (!startDate) {
                startDate = raw.updatedAt ?? raw.createdAt ?? now;
            }

            if (!completedAt) {
                completedAt = raw.updatedAt ?? now;
            }
        }
    }

    if (status === 'todo') {
        completedAt = null;
    }

    return {
        id: raw.id ?? crypto.randomUUID(),
        name: (raw.name ?? '').trim(),
        description: (raw.description ?? '').trim(),
        priority: normalizeTaskPriority(raw.priority),
        storyId: raw.storyId ?? '',
        estimatedHours: typeof raw.estimatedHours === 'number' && raw.estimatedHours > 0 ? raw.estimatedHours : 1,
        status,
        assignedToId,
        workedHours: typeof raw.workedHours === 'number' && raw.workedHours >= 0 ? raw.workedHours : 0,
        createdAt: raw.createdAt ?? now,
        updatedAt: raw.updatedAt ?? now,
        startDate,
        completedAt,
    };
}

export class TaskService {
    private tasks: Task[] = [];

    constructor() {
        this.tasks = this.load();
    }

    private load(): Task[] {
        try {
            const raw = api.getAll();
            if (!Array.isArray(raw)) {
                return [];
            }

            const normalized = raw.map((task) => normalizeTask(task));
            api.setAll(normalized);
            return normalized;
        } catch (error) {
            console.error('Blad wczytywania zadan z localStorage:', error);
            return [];
        }
    }

    private save(): void {
        api.setAll(this.tasks);
    }

    getAll(): Task[] {
        return [...this.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getByStoryId(storyId: string): Task[] {
        return this.getAll().filter((t) => t.storyId === storyId);
    }

    getByAssignedTo(userId: string): Task[] {
        return this.getAll().filter((t) => t.assignedToId === userId);
    }

    getById(id: string): Task | undefined {
        return this.tasks.find((t) => t.id === id);
    }

    create(data: CreateTaskDTO): Task {
        const newTask = TaskModel.create(data);
        this.tasks.push(newTask);
        this.save();
        return newTask;
    }

    update(id: string, data: UpdateTaskDTO): Task | null {
        const index = this.tasks.findIndex((t) => t.id === id);
        if (index === -1) {
            return null;
        }

        const currentTask = this.tasks[index];
        const updatedTask = TaskModel.update(currentTask, data);
        this.tasks[index] = updatedTask;
        this.save();
        return updatedTask;
    }

    delete(id: string): boolean {
        const index = this.tasks.findIndex((t) => t.id === id);
        if (index === -1) {
            return false;
        }

        this.tasks.splice(index, 1);
        this.save();
        return true;
    }
}

export const taskService = new TaskService();
