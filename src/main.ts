import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { projectController } from './controllers/projectController';
import { activeProjectService } from './services/activeProjectService';
import { storyController } from './controllers/storyController';
import { taskController } from './controllers/taskController';
import type { StoryStatus, StoryPriority, TaskStatus, TaskPriority, Task } from './types';

// State
let statusFilter: StoryStatus | 'all' = 'all';
let editingStoryId: string | null = null;
let selectedTaskId: string | null = null;
let taskFormState: { mode: 'create'; storyId: string } | { mode: 'edit'; storyId: string; taskId: string } | null = null;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Brak elementu #app.');
}

const storyPriorityLabels: Record<StoryPriority, string> = {
  low: 'Niski',
  medium: 'Sredni',
  high: 'Wysoki',
};

const storyStatusLabels: Record<StoryStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
};

const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Niski',
  medium: 'Sredni',
  high: 'Wysoki',
};

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'Todo',
  doing: 'Doing',
  done: 'Done',
};

type AppTheme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'app-theme';
let currentTheme: AppTheme = getInitialTheme();

function getLoggedUser() {
  const state = authService.getState();
  if (!state.isLoggedIn || !state.userId) {
    return null;
  }

  return userService.getUserById(state.userId) ?? userService.getCurrentUser();
}

function escapeHtml(value: string): string {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('pl-PL');
}

function getInitialTheme(): AppTheme {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: AppTheme): void {
  currentTheme = theme;
  document.documentElement.setAttribute('data-bs-theme', theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function updateThemeButtonLabel(): void {
  const button = document.getElementById('theme-toggle') as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  button.textContent = currentTheme === 'light' ? 'Tryb: jasny' : 'Tryb: ciemny';
}

function bindThemeToggle(): void {
  const button = document.getElementById('theme-toggle');
  button?.addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
    updateThemeButtonLabel();
  });
}

function buildHeader(): string {
  const user = getLoggedUser();

  return `
    <header class="app-header">
      <h1>ManagMe</h1>
      <div class="header-actions">
        <div class="user-info">
          ${user
            ? `<span>Zalogowany: <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong> (${user.role})</span>`
            : '<span>Brak zalogowanego uzytkownika</span>'}
        </div>
        <button id="theme-toggle" class="btn btn-sm btn-outline-secondary" type="button"></button>
      </div>
    </header>
  `;
}

function renderPage(content: string): void {
  app!.innerHTML = `${buildHeader()}${content}`;
  bindThemeToggle();
  updateThemeButtonLabel();
}

function render(): void {
  if (taskFormState) {
    renderTaskForm(taskFormState);
    return;
  }

  if (selectedTaskId) {
    renderTaskDetail(selectedTaskId);
    return;
  }

  renderDashboard();
}

function renderDashboard(): void {
  const projects = projectController.list();
  const activeProject = activeProjectService.getActiveProject();
  const stories = activeProject ? storyController.listByProject(activeProject.id) : [];
  const filteredStories = statusFilter === 'all' ? stories : stories.filter((story) => story.status === statusFilter);

  const editingStory = editingStoryId
    ? stories.find((story) => story.id === editingStoryId) ?? null
    : null;

  const dashboardContent = `
    <section class="section">
      <h2>Projekty</h2>
      <div class="project-selector">
        <select id="project-select">
          <option value="">-- Wybierz projekt --</option>
          ${projects
            .map(
              (project) => `<option value="${project.id}" ${activeProject?.id === project.id ? 'selected' : ''}>${escapeHtml(project.name)}</option>`,
            )
            .join('')}
        </select>
      </div>
      ${activeProject ? `<p class="active-label">Aktywny projekt: <strong>${escapeHtml(activeProject.name)}</strong></p>` : ''}
    </section>

    ${
      activeProject
        ? `
          <section class="section">
            <h2>Historyjki</h2>

            <div class="filter-bar">
              <button class="filter-btn ${statusFilter === 'all' ? 'active' : ''}" data-filter="all">Wszystkie</button>
              <button class="filter-btn ${statusFilter === 'todo' ? 'active' : ''}" data-filter="todo">Todo</button>
              <button class="filter-btn ${statusFilter === 'doing' ? 'active' : ''}" data-filter="doing">Doing</button>
              <button class="filter-btn ${statusFilter === 'done' ? 'active' : ''}" data-filter="done">Done</button>
            </div>

            <div class="panel">
              <h3>${editingStory ? 'Edycja historyjki' : 'Nowa historyjka'}</h3>
              <form id="story-form" class="form-grid">
                <input type="hidden" id="story-id" value="${editingStory?.id ?? ''}" />

                <label for="story-name">Nazwa</label>
                <input id="story-name" type="text" required value="${editingStory ? escapeHtml(editingStory.name) : ''}" />

                <label for="story-description">Opis</label>
                <textarea id="story-description" required>${editingStory ? escapeHtml(editingStory.description) : ''}</textarea>

                <div class="form-inline">
                  <div>
                    <label for="story-priority">Priorytet</label>
                    <select id="story-priority">
                      ${(['low', 'medium', 'high'] as StoryPriority[])
                        .map(
                          (priority) =>
                            `<option value="${priority}" ${editingStory?.priority === priority ? 'selected' : ''}>${storyPriorityLabels[priority]}</option>`,
                        )
                        .join('')}
                    </select>
                  </div>

                  <div>
                    <label for="story-status">Status</label>
                    <select id="story-status">
                      ${(['todo', 'doing', 'done'] as StoryStatus[])
                        .map(
                          (status) =>
                            `<option value="${status}" ${editingStory?.status === status ? 'selected' : ''}>${storyStatusLabels[status]}</option>`,
                        )
                        .join('')}
                    </select>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit">${editingStory ? 'Zapisz zmiany' : 'Dodaj historyjke'}</button>
                  ${editingStory ? '<button type="button" id="story-cancel">Anuluj</button>' : ''}
                </div>
              </form>
            </div>

            ${
              filteredStories.length === 0
                ? '<p class="empty">Brak historyjek do wyswietlenia.</p>'
                : `<div class="story-grid">
                    ${filteredStories.map((story) => renderStoryCard(story.id)).join('')}
                  </div>`
            }
          </section>

          ${renderKanban(stories)}
        `
        : '<p class="empty">Wybierz projekt, aby zobaczyc historyjki i zadania.</p>'
    }
  `;

  renderPage(dashboardContent);
  bindDashboardEvents(stories);
}

function renderStoryCard(storyId: string): string {
  const story = storyController.detail(storyId);
  const tasks = taskController.listByStory(storyId);

  return `
    <article class="story-card priority-${story.priority}">
      <div class="story-card-header">
        <h3>${escapeHtml(story.name)}</h3>
        <span class="badge status-${story.status}">${storyStatusLabels[story.status]}</span>
      </div>

      <p class="story-description">${escapeHtml(story.description)}</p>

      <div class="story-meta">
        <span>Priorytet: ${storyPriorityLabels[story.priority]}</span>
        <span>Dodano: ${formatDate(story.createdAt)}</span>
      </div>

      <h4>Zadania (${tasks.length})</h4>
      ${
        tasks.length === 0
          ? '<p class="empty">Brak zadan.</p>'
          : `<div class="task-list">
              ${tasks.map((task) => renderTaskListItem(task)).join('')}
            </div>`
      }

      <div class="story-actions">
        <button class="js-story-edit" data-story-id="${story.id}">Edytuj historyjke</button>
        <button class="danger js-story-delete" data-story-id="${story.id}">Usun</button>
        <button class="primary js-task-create" data-story-id="${story.id}">Nowe zadanie</button>
      </div>
    </article>
  `;
}

function renderTaskListItem(task: Task): string {
  const assignee = task.assignedToId ? userService.getUserById(task.assignedToId) : null;

  return `
    <button class="task-item js-task-detail" data-task-id="${task.id}">
      <div class="task-item-row">
        <strong>${escapeHtml(task.name)}</strong>
        <span class="badge status-${task.status}">${taskStatusLabels[task.status]}</span>
      </div>
      <div class="task-item-row muted">
        <span>${assignee ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)}` : 'Nieprzypisane'}</span>
        <span>${taskPriorityLabels[task.priority]}</span>
      </div>
    </button>
  `;
}

function renderKanban(stories: ReturnType<typeof storyController.listByProject>): string {
  const storyById = new Map(stories.map((story) => [story.id, story]));
  const tasks = stories.flatMap((story) => taskController.listByStory(story.id));

  const grouped: Record<TaskStatus, Task[]> = {
    todo: [],
    doing: [],
    done: [],
  };

  tasks.forEach((task) => {
    grouped[task.status].push(task);
  });

  return `
    <section class="section">
      <h2>Tablica Kanban</h2>
      <div class="kanban-grid">
        ${(['todo', 'doing', 'done'] as TaskStatus[])
          .map((status) => {
            const statusTasks = grouped[status];

            return `
              <div class="kanban-column">
                <div class="kanban-column-header">
                  <h3>${taskStatusLabels[status]}</h3>
                  <span>${statusTasks.length}</span>
                </div>

                ${
                  statusTasks.length === 0
                    ? '<p class="empty">Brak zadan.</p>'
                    : statusTasks
                        .map((task) => {
                          const story = storyById.get(task.storyId);
                          const assignee = task.assignedToId ? userService.getUserById(task.assignedToId) : null;

                          return `
                            <button class="kanban-task js-task-detail" data-task-id="${task.id}">
                              <strong>${escapeHtml(task.name)}</strong>
                              <span class="muted">${story ? escapeHtml(story.name) : 'Brak historyjki'}</span>
                              <span class="muted">${assignee ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)}` : 'Nieprzypisane'}</span>
                            </button>
                          `;
                        })
                        .join('')
                }
              </div>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderTaskDetail(taskId: string): void {
  let task: Task;

  try {
    task = taskController.detail(taskId);
  } catch {
    selectedTaskId = null;
    render();
    return;
  }

  const story = storyController.detail(task.storyId);
  const activeProject = activeProjectService.getActiveProject();
  const assignee = task.assignedToId ? userService.getUserById(task.assignedToId) : null;
  const assignableUsers = userService.getAssignableUsers();

  const content = `
    <section class="section">
      <button class="back-btn" id="task-detail-back">Powrot</button>
      <h2>Szczegoly zadania</h2>

      <div class="detail-grid">
        <div><strong>Nazwa:</strong> ${escapeHtml(task.name)}</div>
        <div><strong>Opis:</strong> ${escapeHtml(task.description)}</div>
        <div><strong>Priorytet:</strong> ${taskPriorityLabels[task.priority]}</div>
        <div><strong>Status:</strong> <span class="badge status-${task.status}">${taskStatusLabels[task.status]}</span></div>
        <div><strong>Historyjka:</strong> ${escapeHtml(story.name)}</div>
        <div><strong>Projekt:</strong> ${activeProject ? escapeHtml(activeProject.name) : '-'}</div>
        <div><strong>Przewidywany czas:</strong> ${task.estimatedHours} h</div>
        <div><strong>Zrealizowane roboczogodziny:</strong> ${task.workedHours} h</div>
        <div><strong>Przypisana osoba:</strong> ${assignee ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)} (${assignee.role})` : 'Brak'}</div>
        <div><strong>Data dodania:</strong> ${formatDate(task.createdAt)}</div>
        <div><strong>Data startu:</strong> ${formatDate(task.startDate)}</div>
        <div><strong>Data zakonczenia:</strong> ${formatDate(task.completedAt)}</div>
      </div>

      <div class="task-detail-actions">
        <button class="primary" id="task-edit">Edytuj</button>
        <button class="danger" id="task-delete">Usun</button>
      </div>

      <div class="panel">
        <h3>Przypisanie osoby</h3>
        <form id="task-assignee-form" class="inline-form">
          <select id="task-assignee-select" required>
            <option value="">-- wybierz osobe --</option>
            ${assignableUsers
              .map(
                (user) =>
                  `<option value="${user.id}" ${task.assignedToId === user.id ? 'selected' : ''}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)} (${user.role})</option>`,
              )
              .join('')}
          </select>
          <button type="submit" class="primary">Przypisz i ustaw doing</button>
        </form>
      </div>

      <div class="panel">
        <h3>Zamkniecie zadania</h3>
        <button id="task-mark-done" class="primary" ${task.status === 'done' ? 'disabled' : ''}>Oznacz jako done</button>
      </div>
    </section>
  `;

  renderPage(content);
  bindTaskDetailEvents(task.id);
}

function renderTaskForm(state: NonNullable<typeof taskFormState>): void {
  const isEdit = state.mode === 'edit';
  const task = isEdit ? taskController.detail(state.taskId) : null;
  const story = storyController.detail(state.storyId);
  const assignableUsers = userService.getAssignableUsers();

  const content = `
    <section class="section">
      <button class="back-btn" id="task-form-back">Powrot</button>
      <h2>${isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>

      <form id="task-form" class="panel form-grid">
        <label for="task-name">Nazwa</label>
        <input id="task-name" type="text" required value="${task ? escapeHtml(task.name) : ''}" />

        <label for="task-description">Opis</label>
        <textarea id="task-description" required>${task ? escapeHtml(task.description) : ''}</textarea>

        <div class="form-inline">
          <div>
            <label for="task-priority">Priorytet</label>
            <select id="task-priority">
              ${(['low', 'medium', 'high'] as TaskPriority[])
                .map(
                  (priority) =>
                    `<option value="${priority}" ${task?.priority === priority || (!task && priority === 'medium') ? 'selected' : ''}>${taskPriorityLabels[priority]}</option>`,
                )
                .join('')}
            </select>
          </div>

          <div>
            <label for="task-status">Status</label>
            <select id="task-status">
              ${(['todo', 'doing', 'done'] as TaskStatus[])
                .map(
                  (status) =>
                    `<option value="${status}" ${task?.status === status || (!task && status === 'todo') ? 'selected' : ''}>${taskStatusLabels[status]}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>

        <div class="form-inline">
          <div>
            <label for="task-estimated-hours">Przewidywany czas (h)</label>
            <input id="task-estimated-hours" type="number" min="0.5" step="0.5" value="${task?.estimatedHours ?? 1}" />
          </div>

          <div>
            <label for="task-worked-hours">Zrealizowane roboczogodziny</label>
            <input id="task-worked-hours" type="number" min="0" step="0.5" value="${task?.workedHours ?? 0}" />
          </div>
        </div>

        <label for="task-story">Historyjka</label>
        <input id="task-story" type="text" disabled value="${escapeHtml(story.name)}" />

        <label for="task-assignee">Uzytkownik odpowiedzialny</label>
        <select id="task-assignee">
          <option value="">-- brak przypisania --</option>
          ${assignableUsers
            .map(
              (user) =>
                `<option value="${user.id}" ${task?.assignedToId === user.id ? 'selected' : ''}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)} (${user.role})</option>`,
            )
            .join('')}
        </select>

        <div class="form-actions">
          <button type="submit" class="primary">${isEdit ? 'Zapisz zmiany' : 'Dodaj zadanie'}</button>
          <button type="button" id="task-form-cancel">Anuluj</button>
        </div>
      </form>
    </section>
  `;

  renderPage(content);
  bindTaskFormEvents(state);
}

function bindDashboardEvents(stories: ReturnType<typeof storyController.listByProject>): void {
  document.getElementById('project-select')?.addEventListener('change', (event) => {
    const nextProjectId = (event.target as HTMLSelectElement).value;

    if (nextProjectId) {
      activeProjectService.setActiveProject(nextProjectId);
    } else {
      activeProjectService.clearActiveProject();
    }

    statusFilter = 'all';
    editingStoryId = null;
    selectedTaskId = null;
    taskFormState = null;

    render();
  });

  document.querySelectorAll<HTMLElement>('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter as StoryStatus | 'all';
      statusFilter = filter;
      render();
    });
  });

  document.getElementById('story-form')?.addEventListener('submit', (event) => {
    event.preventDefault();

    const activeProject = activeProjectService.getActiveProject();
    const user = getLoggedUser();

    if (!activeProject || !user) {
      return;
    }

    const storyId = (document.getElementById('story-id') as HTMLInputElement).value;
    const name = (document.getElementById('story-name') as HTMLInputElement).value;
    const description = (document.getElementById('story-description') as HTMLTextAreaElement).value;
    const priority = (document.getElementById('story-priority') as HTMLSelectElement).value as StoryPriority;
    const status = (document.getElementById('story-status') as HTMLSelectElement).value as StoryStatus;

    try {
      if (storyId) {
        storyController.update(storyId, {
          name,
          description,
          priority,
          status,
        });
      } else {
        storyController.create({
          name,
          description,
          priority,
          status,
          projectId: activeProject.id,
          ownerId: user.id,
        });
      }

      editingStoryId = null;
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  document.getElementById('story-cancel')?.addEventListener('click', () => {
    editingStoryId = null;
    render();
  });

  document.querySelectorAll<HTMLElement>('.js-story-edit').forEach((button) => {
    button.addEventListener('click', () => {
      editingStoryId = button.dataset.storyId ?? null;
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('.js-story-delete').forEach((button) => {
    button.addEventListener('click', () => {
      const storyId = button.dataset.storyId;

      if (!storyId) {
        return;
      }

      if (!confirm('Usunac te historyjke?')) {
        return;
      }

      try {
        storyController.remove(storyId);
        editingStoryId = null;
        render();
      } catch (error) {
        alert((error as Error).message);
      }
    });
  });

  document.querySelectorAll<HTMLElement>('.js-task-create').forEach((button) => {
    button.addEventListener('click', () => {
      const storyId = button.dataset.storyId;
      if (!storyId || !stories.some((story) => story.id === storyId)) {
        return;
      }

      taskFormState = {
        mode: 'create',
        storyId,
      };
      render();
    });
  });

  document.querySelectorAll<HTMLElement>('.js-task-detail').forEach((button) => {
    button.addEventListener('click', () => {
      const taskId = button.dataset.taskId;
      if (!taskId) {
        return;
      }

      selectedTaskId = taskId;
      render();
    });
  });
}

function bindTaskDetailEvents(taskId: string): void {
  document.getElementById('task-detail-back')?.addEventListener('click', () => {
    selectedTaskId = null;
    render();
  });

  document.getElementById('task-edit')?.addEventListener('click', () => {
    const task = taskController.detail(taskId);
    taskFormState = {
      mode: 'edit',
      storyId: task.storyId,
      taskId,
    };
    render();
  });

  document.getElementById('task-delete')?.addEventListener('click', () => {
    if (!confirm('Usunac to zadanie?')) {
      return;
    }

    try {
      taskController.remove(taskId);
      selectedTaskId = null;
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  document.getElementById('task-assignee-form')?.addEventListener('submit', (event) => {
    event.preventDefault();

    const assigneeId = (document.getElementById('task-assignee-select') as HTMLSelectElement).value;

    if (!assigneeId) {
      alert('Wybierz osobe do przypisania.');
      return;
    }

    try {
      taskController.assignUser(taskId, assigneeId);
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  document.getElementById('task-mark-done')?.addEventListener('click', () => {
    try {
      taskController.markDone(taskId);
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });
}

function bindTaskFormEvents(state: NonNullable<typeof taskFormState>): void {
  document.getElementById('task-form-back')?.addEventListener('click', () => {
    taskFormState = null;

    if (state.mode === 'edit') {
      selectedTaskId = state.taskId;
    }

    render();
  });

  document.getElementById('task-form-cancel')?.addEventListener('click', () => {
    taskFormState = null;

    if (state.mode === 'edit') {
      selectedTaskId = state.taskId;
    }

    render();
  });

  document.getElementById('task-form')?.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = (document.getElementById('task-name') as HTMLInputElement).value;
    const description = (document.getElementById('task-description') as HTMLTextAreaElement).value;
    const priority = (document.getElementById('task-priority') as HTMLSelectElement).value as TaskPriority;
    const status = (document.getElementById('task-status') as HTMLSelectElement).value as TaskStatus;
    const estimatedHours = Number((document.getElementById('task-estimated-hours') as HTMLInputElement).value);
    const workedHours = Number((document.getElementById('task-worked-hours') as HTMLInputElement).value);
    const assigneeRaw = (document.getElementById('task-assignee') as HTMLSelectElement).value;
    const assignedToId = assigneeRaw.length > 0 ? assigneeRaw : null;

    try {
      if (state.mode === 'create') {
        const created = taskController.create({
          name,
          description,
          priority,
          storyId: state.storyId,
          estimatedHours,
          workedHours,
          status,
          assignedToId,
        });

        selectedTaskId = created.id;
      } else {
        taskController.update(state.taskId, {
          name,
          description,
          priority,
          status,
          estimatedHours,
          workedHours,
          assignedToId,
        });

        selectedTaskId = state.taskId;
      }

      taskFormState = null;
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });
}

activeProjectService.ensureActiveProjectStillExists();
applyTheme(currentTheme);
render();
