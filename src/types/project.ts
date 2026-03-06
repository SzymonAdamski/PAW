export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    author: string;
}

export interface CreateProjectDTO {
    name: string;
    description: string;
    author: string;
}

export type UpdateProjectDTO = Partial<CreateProjectDTO>;