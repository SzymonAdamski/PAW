import { createRepository } from "../api/repositoryFactory";
import { ProjectModel } from "../models/project";
import type { CreateProjectDTO, Project, UpdateProjectDTO } from "../types";

const repository = createRepository<Project>("projects");

export class ProjectService {
    private projects: Project[] = [];

    async init(): Promise<void> {
        this.projects = await this.load();
    }

    private async load(): Promise<Project[]> {
        try {
            const raw = await repository.getAll();
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            console.error("Blad wczytywania projektow:", error);
            throw error;
        }
    }

    private async save(): Promise<void> {
        await repository.setAll(this.projects);
    }

    getAll(): Project[] {
        return [...this.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getById(id: string): Project | undefined {
        return this.projects.find((project) => project.id === id);
    }

    async create(data: CreateProjectDTO): Promise<Project> {
        const newProject = ProjectModel.create(data);
        this.projects.push(newProject);
        await this.save();
        return newProject;
    }

    async update(id: string, data: UpdateProjectDTO): Promise<Project | null> {
        const index = this.projects.findIndex((project) => project.id === id);
        if (index === -1) return null;

        const updated = ProjectModel.update(this.projects[index], data);
        this.projects[index] = updated;
        await repository.set(updated);
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const before = this.projects.length;
        this.projects = this.projects.filter((project) => project.id !== id);
        const deleted = this.projects.length !== before;
        if (deleted) await repository.delete(id);
        return deleted;
    }
}

export const projectService = new ProjectService();
