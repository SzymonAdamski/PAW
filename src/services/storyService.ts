import { StoryModel } from '../models/story';
import { LocalStorageApi } from '../api/localStorageApi';
import type { CreateStoryDTO, UpdateStoryDTO, Story } from '../types';

const api = new LocalStorageApi<Story>('stories');

export class StoryService {
    private stories: Story[] = [];

    constructor() {
        this.stories = this.load();
    }

    private load(): Story[] {
        try {
            const raw = api.getAll();
            return Array.isArray(raw) ? raw : [];
        } catch (error) {
            console.error('Błąd wczytywania historyjek z localStorage:', error);
            return [];
        }
    }

    private save(): void {
        api.setAll(this.stories);
    }

    getAll(): Story[] {
        return [...this.stories].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt)
        );
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
        if (index === -1) return null;

        const updated = StoryModel.update(this.stories[index], data);
        this.stories[index] = updated;
        this.save();
        return updated;
    }

    delete(id: string): boolean {
        const before = this.stories.length;
        this.stories = this.stories.filter((s) => s.id !== id);
        const deleted = this.stories.length !== before;
        if (deleted) this.save();
        return deleted;
    }
}

export const storyService = new StoryService();
