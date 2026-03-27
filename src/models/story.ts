import { v4 as uuid } from 'uuid';
import type { Story, CreateStoryDTO, UpdateStoryDTO } from '../types';

export class StoryModel {
    static create(data: CreateStoryDTO): Story {
        const now = new Date().toISOString();
        return {
            id: uuid(),
            name: data.name.trim(),
            description: data.description.trim(),
            priority: data.priority,
            projectId: data.projectId,
            createdAt: now,
            updatedAt: now,
            status: data.status,
            ownerId: data.ownerId,
        };
    }

    static update(current: Story, data: UpdateStoryDTO): Story {
        return {
            ...current,
            name: data.name !== undefined ? data.name.trim() : current.name,
            description: data.description !== undefined ? data.description.trim() : current.description,
            priority: data.priority !== undefined ? data.priority : current.priority,
            status: data.status !== undefined ? data.status : current.status,
            updatedAt: new Date().toISOString(),
        };
    }

    static validateCreate(data: Partial<CreateStoryDTO>): string[] {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length < 3) {
            errors.push('Nazwa historyjki musi miec co najmniej 3 znaki.');
        }
        if (!data.description || data.description.trim().length < 5) {
            errors.push('Opis historyjki musi miec co najmniej 5 znakow.');
        }
        if (!data.priority || !['low', 'medium', 'high'].includes(data.priority)) {
            errors.push('Priorytet musi byc jednym z: low, medium, high.');
        }
        if (!data.status || !['todo', 'doing', 'done'].includes(data.status)) {
            errors.push('Stan musi byc jednym z: todo, doing, done.');
        }
        if (!data.projectId) {
            errors.push('Historyjka musi byc przypisana do projektu.');
        }
        if (!data.ownerId) {
            errors.push('Historyjka musi miec wlasciciela.');
        }

        return errors;
    }

    static validateUpdate(data: Partial<UpdateStoryDTO>): string[] {
        const errors: string[] = [];

        if (data.name !== undefined && data.name.trim().length < 3) {
            errors.push('Nazwa historyjki musi miec co najmniej 3 znaki.');
        }
        if (data.description !== undefined && data.description.trim().length < 5) {
            errors.push('Opis historyjki musi miec co najmniej 5 znakow.');
        }
        if (data.priority !== undefined && !['low', 'medium', 'high'].includes(data.priority)) {
            errors.push('Priorytet musi byc jednym z: low, medium, high.');
        }
        if (data.status !== undefined && !['todo', 'doing', 'done'].includes(data.status)) {
            errors.push('Stan musi byc jednym z: todo, doing, done.');
        }

        return errors;
    }
}
