import { StoryModel } from '../models/story';
import { StoryService, storyService } from '../services/storyService';
import type { CreateStoryDTO, Story, UpdateStoryDTO } from '../types';

export class StoryController {
    private readonly service: StoryService;

    constructor(service: StoryService = storyService) {
        this.service = service;
    }

    listByProject(projectId: string): Story[] {
        return this.service.getByProjectId(projectId);
    }

    detail(id: string): Story {
        const story = this.service.getById(id);
        if (!story) {
            throw new Error('Historyjka o podanym ID nie istnieje.');
        }
        return story;
    }

    async create(payload: CreateStoryDTO): Promise<Story> {
        const errors = StoryModel.validateCreate(payload);
        if (errors.length > 0) throw new Error('Blad walidacji: ' + errors.join(' '));
        return this.service.create(payload);
    }

    async update(id: string, payload: UpdateStoryDTO): Promise<Story> {
        const existing = this.service.getById(id);
        if (!existing) throw new Error('Historyjka o podanym ID nie istnieje.');

        const errors = StoryModel.validateUpdate(payload);
        if (errors.length > 0) throw new Error('Blad walidacji: ' + errors.join(' '));

        const updated = await this.service.update(id, payload);
        if (!updated) throw new Error('Nie mozna zaktualizowac historyjki.');
        return updated;
    }

    async remove(id: string): Promise<void> {
        const deleted = await this.service.delete(id);
        if (!deleted) throw new Error('Historyjka o podanym ID nie istnieje.');
    }
}

export const storyController = new StoryController();
