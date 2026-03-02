import { v4 as uuid } from 'uuid';
import type { CreateProjectDto, Project, UpdateProjectDto } from '../types/index';

export class ProjectModel {
  // Tworzy nowy, kompletny obiekt Project z danych wejściowych
  static create(data: CreateProjectDto): Project {
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

  // Tworzy zaktualizowaną wersję projektu (immutable update)
  static update(current: Project, data: UpdateProjectDto): Project {
    return {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      description:
        data.description !== undefined
          ? data.description.trim()
          : current.description,
      author: data.author !== undefined ? data.author.trim() : current.author,
      updatedAt: new Date().toISOString(),
    };
  }

  // Centralna walidacja reguł biznesowych
  static validate(data: Partial<CreateProjectDto>): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 3) {
      errors.push('Nazwa musi miec co najmniej 3 znaki.');
    }

    if (!data.description || data.description.trim().length < 5) {
      errors.push('Opis musi miec co najmniej 5 znakow.');
    }

    if (!data.author || data.author.trim().length < 2) {
      errors.push('Autor musi miec co najmniej 2 znaki.');
    }

    return errors;
  }
}
