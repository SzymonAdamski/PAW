import { authService } from './authService';
import { notificationService } from './notificationService';
import { projectService } from './projectService';
import { storyService } from './storyService';
import { taskService } from './taskService';
import { userService } from './userService';

export async function initializeDataServices(): Promise<void> {
    await Promise.all([
        userService.init(),
        projectService.init(),
        storyService.init(),
        taskService.init(),
        notificationService.init(),
    ]);

    authService.init();
}
