import { v4 as uuid } from 'uuid';
import type { Task, CreateTaskDTO, UpdateTaskDTO, TaskPriority, TaskStatus } from '../types';

function isTaskPriority(value: unknown): value is TaskPriority {
    return value === 'low' || value === 'medium' || value === 'high';
}

function isTaskStatus(value: unknown): value is TaskStatus {
    return value === 'todo' || value === 'doing' || value === 'done';
}

export class TaskModel {
    static create(data: CreateTaskDTO): Task {
        const now = new Date().toISOString();
        const status = data.status ?? 'todo';
        const assignedToId = data.assignedToId ?? null;

        let startDate: string | null = null;
        let completedAt: string | null = null;

        if (status === 'doing') {
            startDate = now;
        }

        if (status === 'done') {
            startDate = now;
            completedAt = now;
        }

        return {
            id: uuid(),
            name: data.name.trim(),
            description: data.description.trim(),
            priority: data.priority,
            storyId: data.storyId,
            estimatedHours: data.estimatedHours,
            assignedToId,
            status,
            startDate,
            completedAt,
            workedHours: data.workedHours ?? 0,
            createdAt: now,
            updatedAt: now,
        };
    }

    static update(current: Task, data: UpdateTaskDTO): Task {
        const now = new Date().toISOString();

        const status = data.status ?? current.status;
        const assignedToId = data.assignedToId !== undefined ? data.assignedToId : current.assignedToId;

        let startDate = current.startDate;
        let completedAt = current.completedAt;

        if (status === 'todo') {
            completedAt = null;
        }

        if (status === 'doing') {
            if (!startDate) {
                startDate = now;
            }
            completedAt = null;
        }

        if (status === 'done') {
            if (!startDate) {
                startDate = now;
            }
            if (!completedAt || current.status !== 'done') {
                completedAt = now;
            }
        }

        return {
            ...current,
            name: data.name !== undefined ? data.name.trim() : current.name,
            description: data.description !== undefined ? data.description.trim() : current.description,
            priority: data.priority !== undefined ? data.priority : current.priority,
            estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours : current.estimatedHours,
            status,
            assignedToId,
            workedHours: data.workedHours !== undefined ? data.workedHours : current.workedHours,
            startDate,
            completedAt,
            updatedAt: now,
        };
    }

    static validateCreate(data: Partial<CreateTaskDTO>): string[] {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length < 3) {
            errors.push('Nazwa zadania musi miec co najmniej 3 znaki.');
        }
        if (!data.description || data.description.trim().length < 5) {
            errors.push('Opis zadania musi miec co najmniej 5 znakow.');
        }
        if (!data.storyId) {
            errors.push('Zadanie musi byc przypisane do historyjki.');
        }
        if (!isTaskPriority(data.priority)) {
            errors.push('Priorytet zadania musi byc jednym z: low, medium, high.');
        }
        if (typeof data.estimatedHours !== 'number' || data.estimatedHours <= 0) {
            errors.push('Przewidywany czas wykonania musi byc dodatni.');
        }

        const status = data.status ?? 'todo';
        if (!isTaskStatus(status)) {
            errors.push('Stan zadania musi byc jednym z: todo, doing, done.');
        }

        if ((status === 'doing' || status === 'done') && !data.assignedToId) {
            errors.push('Zadanie w stanie doing/done musi miec przypisana osobe.');
        }

        if (data.workedHours !== undefined && data.workedHours < 0) {
            errors.push('Ilosc roboczogodzin nie moze byc ujemna.');
        }

        return errors;
    }

    static validateUpdate(data: Partial<UpdateTaskDTO>): string[] {
        const errors: string[] = [];

        if (data.name !== undefined && data.name.trim().length < 3) {
            errors.push('Nazwa zadania musi miec co najmniej 3 znaki.');
        }
        if (data.description !== undefined && data.description.trim().length < 5) {
            errors.push('Opis zadania musi miec co najmniej 5 znakow.');
        }
        if (data.priority !== undefined && !isTaskPriority(data.priority)) {
            errors.push('Priorytet zadania musi byc jednym z: low, medium, high.');
        }
        if (data.estimatedHours !== undefined && data.estimatedHours <= 0) {
            errors.push('Przewidywany czas wykonania musi byc dodatni.');
        }
        if (data.status !== undefined && !isTaskStatus(data.status)) {
            errors.push('Stan zadania musi byc jednym z: todo, doing, done.');
        }
        if (data.workedHours !== undefined && data.workedHours < 0) {
            errors.push('Ilosc roboczogodzin nie moze byc ujemna.');
        }

        return errors;
    }
}
