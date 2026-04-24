import { TaskModel } from '../models/task';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { storyService } from '../services/storyService';
import { TaskService, taskService } from '../services/taskService';
import { userService } from '../services/userService';
import type { CreateTaskDTO, StoryStatus, Task, UpdateTaskDTO } from '../types';

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

    async create(payload: CreateTaskDTO): Promise<Task> {
        const story = storyService.getById(payload.storyId);
        if (!story) {
            throw new Error('Historyjka o podanym ID nie istnieje.');
        }

        const errors = TaskModel.validateCreate(payload);
        if (errors.length > 0) {
            throw new Error('Blad walidacji: ' + errors.join(' '));
        }

        this.ensureValidAssignee(payload.assignedToId);

        const created = await this.service.create(payload);
        await this.syncStoryStatus(created.storyId);
        await this.notifyStoryOwnerAboutTaskCreated(created.id);
        return created;
    }

    async update(id: string, payload: UpdateTaskDTO): Promise<Task> {
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

        const updated = await this.service.update(id, payload);
        if (!updated) {
            throw new Error('Nie mozna zaktualizowac zadania.');
        }

        await this.syncStoryStatus(updated.storyId);
        await this.notifyAboutAssigneeChange(existing, updated);
        await this.notifyAboutStatusChange(existing, updated);
        return updated;
    }

    async assignUser(id: string, userId: string): Promise<Task> {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        this.ensureValidAssignee(userId);

        const updated = await this.service.update(id, {
            assignedToId: userId,
            status: 'doing',
        });

        if (!updated) {
            throw new Error('Nie mozna przypisac osoby do zadania.');
        }

        const story = storyService.getById(updated.storyId);
        if (story && story.status === 'todo') {
            await storyService.update(story.id, { status: 'doing' });
        }

        await this.syncStoryStatus(updated.storyId);
        await this.notifyAboutAssigneeChange(task, updated);
        await this.notifyAboutStatusChange(task, updated);
        return updated;
    }

    async markDone(id: string): Promise<Task> {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        if (!task.assignedToId) {
            throw new Error('Najpierw przypisz osobe do zadania.');
        }

        const updated = await this.service.update(id, { status: 'done' });
        if (!updated) {
            throw new Error('Nie mozna oznaczyc zadania jako done.');
        }

        await this.syncStoryStatus(updated.storyId);
        await this.notifyAboutStatusChange(task, updated);
        return updated;
    }

    async remove(id: string): Promise<void> {
        const task = this.service.getById(id);
        if (!task) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        const deleted = await this.service.delete(id);
        if (!deleted) {
            throw new Error('Zadanie o podanym ID nie istnieje.');
        }

        await this.syncStoryStatus(task.storyId);
        await this.notifyStoryOwnerAboutTaskRemoved(task);
    }

    private ensureValidAssignee(userId: string | null | undefined): void {
        if (!userId) {
            return;
        }

        const user = userService.getUserById(userId);
        if (!user) {
            throw new Error('Przypisany uzytkownik nie istnieje.');
        }

        if (user.blocked) {
            throw new Error('Nie mozna przypisac zablokowanego uzytkownika.');
        }

        if (user.role !== 'developer' && user.role !== 'devops') {
            throw new Error('Zadanie moze byc przypisane tylko do devops lub developer.');
        }
    }

    private async notifyStoryOwnerAboutTaskCreated(taskId: string): Promise<void> {
        const task = this.service.getById(taskId);
        if (!task) {
            return;
        }

        const story = storyService.getById(task.storyId);
        if (!story || this.shouldSkipRecipient(story.ownerId)) {
            return;
        }

        await notificationService.create({
            title: 'Nowe zadanie w historyjce',
            message: `Dodano zadanie "${task.name}" do historyjki "${story.name}".`,
            priority: 'medium',
            recipientId: story.ownerId,
        });
    }

    private async notifyStoryOwnerAboutTaskRemoved(task: Task): Promise<void> {
        const story = storyService.getById(task.storyId);
        if (!story || this.shouldSkipRecipient(story.ownerId)) {
            return;
        }

        await notificationService.create({
            title: 'Usuniecie zadania z historyjki',
            message: `Usunieto zadanie "${task.name}" z historyjki "${story.name}".`,
            priority: 'medium',
            recipientId: story.ownerId,
        });
    }

    private async notifyAboutAssigneeChange(previousTask: Task, updatedTask: Task): Promise<void> {
        const previousAssigneeId = previousTask.assignedToId;
        const nextAssigneeId = updatedTask.assignedToId;

        if (!nextAssigneeId || nextAssigneeId === previousAssigneeId || this.shouldSkipRecipient(nextAssigneeId)) {
            return;
        }

        const story = storyService.getById(updatedTask.storyId);

        await notificationService.create({
            title: 'Przypisanie osoby do zadania',
            message: story
                ? `Zadanie "${updatedTask.name}" w historyjce "${story.name}" zostalo do Ciebie przypisane.`
                : `Zadanie "${updatedTask.name}" zostalo do Ciebie przypisane.`,
            priority: 'high',
            recipientId: nextAssigneeId,
        });
    }

    private async notifyAboutStatusChange(previousTask: Task, updatedTask: Task): Promise<void> {
        if (previousTask.status === updatedTask.status) {
            return;
        }

        if (updatedTask.status !== 'doing' && updatedTask.status !== 'done') {
            return;
        }

        const story = storyService.getById(updatedTask.storyId);
        if (!story || this.shouldSkipRecipient(story.ownerId)) {
            return;
        }

        const priority = updatedTask.status === 'done' ? 'medium' : 'low';
        const statusLabel = updatedTask.status === 'done' ? 'done' : 'doing';

        await notificationService.create({
            title: 'Zmiana statusu zadania',
            message: `Zadanie "${updatedTask.name}" w historyjce "${story.name}" zmienilo status na ${statusLabel}.`,
            priority,
            recipientId: story.ownerId,
        });
    }

    private shouldSkipRecipient(recipientId: string | null | undefined): boolean {
        if (!recipientId) {
            return true;
        }

        const actorId = authService.getLoggedUserId();
        return actorId !== null && actorId === recipientId;
    }

    private async syncStoryStatus(storyId: string): Promise<void> {
        const story = storyService.getById(storyId);
        if (!story) {
            return;
        }

        const tasks = this.service.getByStoryId(storyId);
        const nextStatus = this.computeStoryStatus(tasks, story.status);

        if (nextStatus !== story.status) {
            await storyService.update(story.id, { status: nextStatus });
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
