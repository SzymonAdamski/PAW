import { TaskModel } from '../models/task';
import { LocalStorageApi } from '../api/localStorageApi';
import type { CreateTaskDTO, UpdateTaskDTO, Task } from '../types';

const api = new LocalStorageApi<Task>('tasks');

export class TaskService {
    private tasks: Task[] = [];

    constructor() {
        this.tasks = this.load();
    }

    private load(): Task[] {
        try {
            const raw = api.getAll();
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            console.error('Błąd wczytywania zadań z localStorage:', error);
            return [];
        }
    }

    private save(): void {
        api.setAll(this.tasks);
    }

    getAll(): Task[] {
        return [...this.tasks].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
    }

    getByStoryId(storyId: string): Task[] {
        return this.getAll().filter((t) => t.storyId === storyId);
    }

    getByAssignedTo(userId: string): Task[] {
        return this.getAll().filter((t) => t.assignedToId === userId);
    }

    getById(id: string): Task | undefined {
        return this.tasks.find((t) => t.id === id);
    }

    create(data: CreateTaskDTO): Task {
        const newTask = TaskModel.create(data);
        this.tasks.push(newTask);
        this.save();
        return newTask;
    }

    update(id: string, data: UpdateTaskDTO): Task | null {
        const index = this.tasks.findIndex((t) => t.id === id);

        if (index === -1) {
            return null;
        }

        const currentTask = this.tasks[index];
        const updatedTask = TaskModel.update(currentTask, data);
        this.tasks[index] = updatedTask;
        this.save();
        return updatedTask;
    }

    delete(id: string): boolean {
        const index = this.tasks.findIndex((t) => t.id === id);

        if (index === -1) {
            return false;
        }

        this.tasks.splice(index, 1);
        this.save();
        return true;
    }
}

export const taskService = new TaskService();
