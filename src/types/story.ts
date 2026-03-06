export type StoryPriority = 'low' | 'medium' | 'high';
export type StoryStatus = 'todo' | 'in-progress' | 'done';

export interface Story {
    id: string;
    name: string;
    description: string;
    priority: StoryPriority;
    projectId: string;
    createdAt: string;
    updatedAt: string;
    status: StoryStatus;
    ownerId: string;

}

export type CreateStoryDTO = {
    name: string;
    description: string;
    priority: StoryPriority;
    projectId: string;
    status: StoryStatus;
    ownerId: string;
}

export type UpdateStoryDTO = Partial<Omit<CreateStoryDTO, 'projectId' | 'ownerId'>>;