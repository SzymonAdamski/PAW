import { v4 as uuid } from 'uuid';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '../types';

export class ProjectModel{
    static create(data: CreateProjectDTO): Project {
        const now = new Date().toISOString();
        return {
            id: uuid(),
            name: data.name.trim(),
            description: data.description.trim(),
            author: data.author.trim(),
            createdAt: now,
            updatedAt: now,
        };
    }
    static update(current: Project, data: UpdateProjectDTO): Project {
      return {
        ...current,
        name: data.name !== undefined ? data.name.trim() : current.name,
        description:
        data.description !== undefined 
        ? data.description.trim() 
        : current.description,
        updatedAt: new Date().toISOString(),
        };
    }
    static validateCreate(data: Partial<CreateProjectDTO>): string[] {
        const errors: string[] = [];

        if (!data.name || data.name.trim().length < 3) {
            errors.push("Nazwa projektu musi mieć co najmniej 3 znaki.");
        }
        if (!data.description || data.description.trim().length < 10) {
            errors.push("Opis projektu musi mieć co najmniej 10 znaków.");
        }
        if (!data.author || data.author.trim().length < 2) {
            errors.push("Autor projektu musi mieć co najmniej 2 znaki.");
        }
        return errors;
    }
    static validateUpdate(data: Partial<UpdateProjectDTO>): string[] {
        const errors: string[] = [];

        if (data.name !== undefined && data.name.trim().length < 3) {
            errors.push("Nazwa projektu musi mieć co najmniej 3 znaki.");
        }

        if (data.description !== undefined && data.description.trim().length < 10) {
            errors.push("Opis projektu musi mieć co najmniej 10 znaków.");
        }
        return errors;
    }
}  