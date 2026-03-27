import { StoryModel } from '../models/story';
import { LocalStorageApi } from '../api/localStorageApi';
import type { CreateStoryDTO, UpdateStoryDTO, Story, StoryStatus } from '../types';

const api = new LocalStorageApi<Story>('stories');

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

    constructor() {
        this.stories = this.load();
    }

    private load(): Story[] {
        try {
            const raw = api.getAll();
            if (!Array.isArray(raw)) {
                return [];
            }

            const normalized = raw.map((story) => normalizeStory(story));
            api.setAll(normalized);
            return normalized;
        } catch (error) {
            console.error('Blad wczytywania historyjek z localStorage:', error);
            return [];
        }
    }

    private save(): void {
        api.setAll(this.stories);
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

    create(data: CreateStoryDTO): Story {
        const newStory = StoryModel.create(data);
        this.stories.push(newStory);
        this.save();
        return newStory;
    }

    update(id: string, data: UpdateStoryDTO): Story | null {
        const index = this.stories.findIndex((s) => s.id === id);
        if (index === -1) {
            return null;
        }

        const updated = StoryModel.update(this.stories[index], data);
        this.stories[index] = updated;
        this.save();
        return updated;
    }

    delete(id: string): boolean {
        const before = this.stories.length;
        this.stories = this.stories.filter((s) => s.id !== id);
        const deleted = this.stories.length !== before;

        if (deleted) {
            this.save();
        }

        return deleted;
    }
}

export const storyService = new StoryService();
