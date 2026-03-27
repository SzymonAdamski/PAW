import { TaskModel } from '../models/task';
import { TaskService, taskService } from '../services/taskService';
import { storyService } from '../services/storyService';
import { userService } from '../services/userService';
import type { CreateTaskDTO, UpdateTaskDTO, Task, StoryStatus } from '../types';

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
        const story = storyService.getById(payload.storyId);
        if (!story) {
            throw new Error('Historyjka o podanym ID nie istnieje.');
        }

        const errors = TaskModel.validateCreate(payload);
        if (errors.length > 0) {
            throw new Error('Blad walidacji: ' + errors.join(' '));
        }

        this.ensureValidAssignee(payload.assignedToId);

        const created = this.service.create(payload);
        this.syncStoryStatus(created.storyId);
        return created;
    }

    update(id: string, payload: UpdateTaskDTO): Task {
        const existing = this.service.getById(id);
        if (!existing) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        const errors = TaskModel.validateUpdate(payload);
        if (errors.length > 0) {
            throw new Error('Blad walidacji: ' + errors.join(' '));
        }

        this.ensureValidAssignee(payload.assignedToId);

        const nextStatus = payload.status ?? existing.status;
        const nextAssignee = payload.assignedToId !== undefined ? payload.assignedToId : existing.assignedToId;

        if ((nextStatus === 'doing' || nextStatus === 'done') && !nextAssignee) {
            throw new Error('Zadanie w stanie doing/done musi miec przypisana osobe.');
        }

        const updated = this.service.update(id, payload);
        if (!updated) {
            throw new Error('Nie mozna zaktualizowac zadania.');
        }

        this.syncStoryStatus(updated.storyId);
        return updated;
    }

    assignUser(id: string, userId: string): Task {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        this.ensureValidAssignee(userId);

        const updated = this.service.update(id, {
            assignedToId: userId,
            status: 'doing',
        });

        if (!updated) {
            throw new Error('Nie mozna przypisac osoby do zadania.');
        }

        const story = storyService.getById(updated.storyId);
        if (story && story.status === 'todo') {
            storyService.update(story.id, { status: 'doing' });
        }

        this.syncStoryStatus(updated.storyId);
        return updated;
    }

    markDone(id: string): Task {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        if (!task.assignedToId) {
            throw new Error('Najpierw przypisz osobe do zadania.');
        }

        const updated = this.service.update(id, { status: 'done' });
        if (!updated) {
            throw new Error('Nie mozna oznaczyc zadania jako done.');
        }

        this.syncStoryStatus(updated.storyId);
        return updated;
    }

    remove(id: string): void {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        const deleted = this.service.delete(id);
        if (!deleted) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        this.syncStoryStatus(task.storyId);
    }

    private ensureValidAssignee(userId: string | null | undefined): void {
        if (!userId) {
            return;
        }

        const user = userService.getUserById(userId);
        if (!user) {
            throw new Error('Przypisany uzytkownik nie istnieje.');
        }

        if (user.role !== 'developer' && user.role !== 'devops') {
            throw new Error('Zadanie moze byc przypisane tylko do devops lub developer.');
        }
    }

    private syncStoryStatus(storyId: string): void {
        const story = storyService.getById(storyId);
        if (!story) {
            return;
        }

        const tasks = this.service.getByStoryId(storyId);
        const nextStatus = this.computeStoryStatus(tasks, story.status);

        if (nextStatus !== story.status) {
            storyService.update(story.id, { status: nextStatus });
        }
    }

    private computeStoryStatus(tasks: Task[], _currentStatus: StoryStatus): StoryStatus {
        if (tasks.length === 0) {
            return 'todo';
        }

        if (tasks.every((task) => task.status === 'done')) {
            return 'done';
        }

        if (tasks.some((task) => task.status === 'doing')) {
            return 'doing';
        }

        return 'todo';
    }
}

export const taskController = new TaskController();
