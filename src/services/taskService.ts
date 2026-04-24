import { createRepository } from '../api/repositoryFactory';
import { TaskModel } from '../models/task';
import type { CreateTaskDTO, Task, TaskPriority, TaskStatus, UpdateTaskDTO } from '../types';

const repository = createRepository<Task>('tasks');

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

    async init(): Promise<void> {
        this.tasks = await this.load();
    }

    private async load(): Promise<Task[]> {
        try {
            const raw = await repository.getAll();
            if (!Array.isArray(raw)) {
                return [];
            }

            const normalized = raw.map((task) => normalizeTask(task));
            await repository.setAll(normalized);
            return normalized;
        } catch (error) {
            console.error('Blad wczytywania zadan:', error);
            throw error;
        }
    }

    private async save(): Promise<void> {
        await repository.setAll(this.tasks);
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

    async create(data: CreateTaskDTO): Promise<Task> {
        const newTask = TaskModel.create(data);
        this.tasks.push(newTask);
        await this.save();
        return newTask;
    }

    async update(id: string, data: UpdateTaskDTO): Promise<Task | null> {
        const index = this.tasks.findIndex((t) => t.id === id);
        if (index === -1) {
            return null;
        }

        const currentTask = this.tasks[index];
        const updatedTask = TaskModel.update(currentTask, data);
        this.tasks[index] = updatedTask;
        await repository.set(updatedTask);
        return updatedTask;
    }

    async delete(id: string): Promise<boolean> {
        const index = this.tasks.findIndex((t) => t.id === id);
        if (index === -1) {
            return false;
        }

        this.tasks.splice(index, 1);
        await repository.delete(id);
        return true;
    }
}

export const taskService = new TaskService();
