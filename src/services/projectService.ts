import { ProjectModel } from "../models/project";
import { LocalStorageApi } from "../api/localStorageApi";
import  type { CreateProjectDTO, UpdateProjectDTO, Project } from "../types";

const api = new LocalStorageApi<Project>("projects");

export class ProjectService {
  private projects: Project[] = []; // żeby się nie parsowało za każdym razem

    constructor() {
        this.projects = this.load();
    }
    
    private load(): Project[] { // zabebezpieczenia i inne takie tam żeby się nie wywaliło 
        try {
            const raw = api.getAll();
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            console.error("Błąd wczytywania projektów z localStorage:", error);
            return [];
        }
    }
    
    private save(): void {
        api.setAll(this.projects);
    }

    getAll(): Project[] {
        return[...this.projects].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    getById(id: string): Project | undefined {
        return this.projects.find((project) => project.id === id);
    }

    create(data: CreateProjectDTO): Project {
        const newProject = ProjectModel.create(data);
        this.projects.push(newProject);
        this.save();
        return newProject;
    }

    update(id: string, data: UpdateProjectDTO): Project | null {
        const index = this.projects.findIndex((project) => project.id === id);
        if (index === -1) return null;

        const updated = ProjectModel.update(this.projects[index], data);
        this.projects[index] = updated;
        this.save();
        return updated;
    }

    delete(id: string): boolean {
        const before = this.projects.length;
        this.projects = this.projects.filter((project) => project.id !== id);
        const deleted = this.projects.length !== before;
        if (deleted) this.save();
        return deleted;
    }
}

export const projectService = new ProjectService(); // do nie tworzenia wielu instancji serwisu