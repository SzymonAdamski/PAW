import { TaskModel } from '../models/task';
import { TaskService, taskService } from '../services/taskService';
import type { CreateTaskDTO, UpdateTaskDTO, Task } from '../types';

export class TaskController {
    private readonly service: TaskService;

    constructor(service: TaskService = taskService) {
        this.service = service;
    }

    list(): Task[] {
        return this.service.getAll();
    }

    listByStory(storyId: string): Task[] {
        return this.service.getByStoryId(storyId);
    }

    listByAssignee(userId: string): Task[] {
        return this.service.getByAssignedTo(userId);
    }

    detail(id: string): Task {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }
        return task;
    }

    create(payload: CreateTaskDTO): Task {
        const errors = TaskModel.validateCreate(payload);
        if (errors.length > 0) throw new Error('Błąd walidacji: ' + errors.join(' '));
        return this.service.create(payload);
    }

    update(id: string, payload: UpdateTaskDTO): Task {
        const existing = this.service.getById(id);
        if (!existing) throw new Error('Zadanie o podanym ID nie istnieje.');

        const errors = TaskModel.validateUpdate(payload);
        if (errors.length > 0) throw new Error('Błąd walidacji: ' + errors.join(' '));

        const updated = this.service.update(id, payload);
        if (!updated) throw new Error('Nie można zaktualizować zadania.');
        return updated;
    }

    remove(id: string): void {
        const deleted = this.service.delete(id);
        if (!deleted) throw new Error('Zadanie o podanym ID nie istnieje.');
    }
}

export const taskController = new TaskController();
