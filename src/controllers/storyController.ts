import { StoryModel } from '../models/story';
import { StoryService, storyService } from '../services/storyService';
import type { CreateStoryDTO, UpdateStoryDTO, Story } from '../types';

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

    create(payload: CreateStoryDTO): Story {
        const errors = StoryModel.validateCreate(payload);
        if (errors.length > 0) throw new Error('Błąd walidacji: ' + errors.join(' '));
        return this.service.create(payload);
    }

    update(id: string, payload: UpdateStoryDTO): Story {
        const existing = this.service.getById(id);
        if (!existing) throw new Error('Historyjka o podanym ID nie istnieje.');

        const errors = StoryModel.validateUpdate(payload);
        if (errors.length > 0) throw new Error('Błąd walidacji: ' + errors.join(' '));

        const updated = this.service.update(id, payload);
        if (!updated) throw new Error('Nie można zaktualizować historyjki.');
        return updated;
    }

    remove(id: string): void {
        const deleted = this.service.delete(id);
        if (!deleted) throw new Error('Historyjka o podanym ID nie istnieje.');
    }
}

export const storyController = new StoryController();
