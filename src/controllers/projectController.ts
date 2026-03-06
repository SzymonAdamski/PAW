import { ProjectModel } from "../models/project";
import { ProjectService, projectService } from "../services/projectService";
import type { CreateProjectDTO, UpdateProjectDTO, Project} from "../types";

export class ProjectController {
    private readonly service: ProjectService;

    constructor(service: ProjectService = projectService) {
        this.service = service;
    }

    list(): Project[] {
        return this.service.getAll();
    }

    detail(id: string): Project {
        const project = this.service.getById(id);
        if (!project) {
            throw new Error("Projekt o podanym ID nie istnieje.");
        }
        return project;
    }

    create(payload: CreateProjectDTO): Project {
        const errors = ProjectModel.validateCreate(payload);
        if (errors.length > 0) throw new Error("Błąd walidacji: " + errors.join(" "));
        return this.service.create(payload);
    }
    
    update(id: string, payload: UpdateProjectDTO): Project {
        const existing = this.service.getById(id);
        if (!existing) throw new Error("Projekt o podanym ID nie istnieje.");

        const errors = ProjectModel.validateUpdate(payload);
        if (errors.length > 0) throw new Error("Błąd walidacji: " + errors.join(" "));

        const updated = this.service.update(id, payload);
        if (!updated) throw new Error("Nie można zaktualizować projektu.");
        return updated;
    }

    remove(id: string): void {
        const deleted = this.service.delete(id);
        if (!deleted) throw new Error("Projekt o podanym ID nie istnieje.");
    }
}

export const projectController = new ProjectController();