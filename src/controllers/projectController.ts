import { ProjectModel } from "../models/project";
import { authService } from "../services/authService";
import { notificationService } from "../services/notificationService";
import { ProjectService, projectService } from "../services/projectService";
import { userService } from "../services/userService";
import type { CreateProjectDTO, Project, UpdateProjectDTO } from "../types";

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

    async create(payload: CreateProjectDTO): Promise<Project> {
        const errors = ProjectModel.validateCreate(payload);
        if (errors.length > 0) throw new Error("Blad walidacji: " + errors.join(" "));
        const created = await this.service.create(payload);
        await this.notifyAdminsAboutProjectCreation(created);
        return created;
    }

    async update(id: string, payload: UpdateProjectDTO): Promise<Project> {
        const existing = this.service.getById(id);
        if (!existing) throw new Error("Projekt o podanym ID nie istnieje.");

        const errors = ProjectModel.validateUpdate(payload);
        if (errors.length > 0) throw new Error("Blad walidacji: " + errors.join(" "));

        const updated = await this.service.update(id, payload);
        if (!updated) throw new Error("Nie mozna zaktualizowac projektu.");
        return updated;
    }

    async remove(id: string): Promise<void> {
        const deleted = await this.service.delete(id);
        if (!deleted) throw new Error("Projekt o podanym ID nie istnieje.");
    }

    private async notifyAdminsAboutProjectCreation(project: Project): Promise<void> {
        const actorId = authService.getLoggedUserId();
        const recipients = userService.getAdminUsers({
            excludeUserId: actorId ?? undefined,
            includeBlocked: false,
        });

        await Promise.all(
            recipients.map((admin) =>
                notificationService.create({
                    title: 'Utworzono nowy projekt',
                    message: `Projekt "${project.name}" zostal utworzony.`,
                    priority: 'high',
                    recipientId: admin.id,
                }),
            ),
        );
    }
}

export const projectController = new ProjectController();
