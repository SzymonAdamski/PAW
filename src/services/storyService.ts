import { createRepository } from '../api/repositoryFactory';
import { StoryModel } from '../models/story';
import type { CreateStoryDTO, Story, StoryStatus, UpdateStoryDTO } from '../types';

const repository = createRepository<Story>('stories');

function normalizeStoryStatus(status: unknown): StoryStatus {
    if (status === 'in-progress') {
        return 'doing';
    }

    if (status === 'todo' || status === 'doing' || status === 'done') {
        return status;
    }

    return 'todo';
}

function normalizeStory(raw: Partial<Story>): Story {
    const now = new Date().toISOString();

    return {
        id: raw.id ?? crypto.randomUUID(),
        name: (raw.name ?? '').trim(),
        description: (raw.description ?? '').trim(),
        priority: raw.priority === 'low' || raw.priority === 'medium' || raw.priority === 'high' ? raw.priority : 'medium',
        projectId: raw.projectId ?? '',
        createdAt: raw.createdAt ?? now,
        updatedAt: raw.updatedAt ?? now,
        status: normalizeStoryStatus(raw.status),
        ownerId: raw.ownerId ?? '',
    };
}

export class StoryService {
    private stories: Story[] = [];

    async init(): Promise<void> {
        this.stories = await this.load();
    }

    private async load(): Promise<Story[]> {
        try {
            const raw = await repository.getAll();
            if (!Array.isArray(raw)) {
                return [];
            }

            const normalized = raw.map((story) => normalizeStory(story));
            await repository.setAll(normalized);
            return normalized;
        } catch (error) {
            console.error('Blad wczytywania historyjek:', error);
            throw error;
        }
    }

    private async save(): Promise<void> {
        await repository.setAll(this.stories);
    }

    getAll(): Story[] {
        return [...this.stories].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getByProjectId(projectId: string): Story[] {
        return this.getAll().filter((s) => s.projectId === projectId);
    }

    getById(id: string): Story | undefined {
        return this.stories.find((s) => s.id === id);
    }

    async create(data: CreateStoryDTO): Promise<Story> {
        const newStory = StoryModel.create(data);
        this.stories.push(newStory);
        await this.save();
        return newStory;
    }

    async update(id: string, data: UpdateStoryDTO): Promise<Story | null> {
        const index = this.stories.findIndex((s) => s.id === id);
        if (index === -1) {
            return null;
        }

        const updated = StoryModel.update(this.stories[index], data);
        this.stories[index] = updated;
        await repository.set(updated);
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const before = this.stories.length;
        this.stories = this.stories.filter((s) => s.id !== id);
        const deleted = this.stories.length !== before;

        if (deleted) {
            await repository.delete(id);
        }

        return deleted;
    }
}

export const storyService = new StoryService();
