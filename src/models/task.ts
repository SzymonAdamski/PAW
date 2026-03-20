import { v4 as uuid } from 'uuid';
import type { Task, CreateTaskDTO, UpdateTaskDTO } from '../types';

export class TaskModel {
    static create(data: CreateTaskDTO): Task {
        const now = new Date().toISOString();
        return {
            id: uuid(),
            name: data.name.trim(),
            description: data.description.trim(),
            storyId: data.storyId,
            assignedToId: data.assignedToId,
            status: data.status || 'todo',
            startDate: data.startDate || now,
            workedHours: data.workedHours || 0,
            createdAt: now,
            updatedAt: now,
        };
    }

    static update(current: Task, data: UpdateTaskDTO): Task {
        return {
            ...current,
            name: data.name !== undefined ? data.name.trim() : current.name,
            description: data.description !== undefined ? data.description.trim() : current.description,
            status: data.status !== undefined ? data.status : current.status,
            assignedToId: data.assignedToId !== undefined ? data.assignedToId : current.assignedToId,
            workedHours: data.workedHours !== undefined ? data.workedHours : current.workedHours,
            updatedAt: new Date().toISOString(),
        };
    }

    static validateCreate(data: Partial<CreateTaskDTO>): string[] {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length < 3) {
            errors.push('Nazwa zadania musi mieć co najmniej 3 znaki.');
        }
        if (!data.description || data.description.trim().length < 5) {
            errors.push('Opis zadania musi mieć co najmniej 5 znaków.');
        }
        if (!data.storyId) {
            errors.push('Zadanie musi być przypisane do historyjki.');
        }
        if (!data.assignedToId) {
            errors.push('Zadanie musi być przypisane do osoby.');
        }

        return errors;
    }

    static validateUpdate(data: Partial<UpdateTaskDTO>): string[] {
        const errors: string[] = [];

        if (data.name !== undefined && data.name.trim().length < 3) {
            errors.push('Nazwa zadania musi mieć co najmniej 3 znaki.');
        }
        if (data.description !== undefined && data.description.trim().length < 5) {
            errors.push('Opis zadania musi mieć co najmniej 5 znaków.');
        }
        if (data.workedHours !== undefined && data.workedHours < 0) {
            errors.push('Ilość roboczogodzin nie może być ujemna.');
        }

        return errors;
    }
}
