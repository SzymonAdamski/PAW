import { ProjectModel } from "../models/project";
import { ProjectService, projectService } from "../services/projectService";
import { authService } from "../services/authService";
import { notificationService } from "../services/notificationService";
import { userService } from "../services/userService";
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
        const created = this.service.create(payload);
        this.notifyAdminsAboutProjectCreation(created);
        return created;
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

    private notifyAdminsAboutProjectCreation(project: Project): void {
        const actorId = authService.getLoggedUserId();
        const recipients = userService
            .getAllUsers()
            .filter((user) => user.role === 'admin' && user.id !== actorId);

        recipients.forEach((admin) => {
            notificationService.create({
                title: 'Utworzono nowy projekt',
                message: `Projekt "${project.name}" zostal utworzony.`,
                priority: 'high',
                recipientId: admin.id,
            });
        });
    }
}

export const projectController = new ProjectController();
