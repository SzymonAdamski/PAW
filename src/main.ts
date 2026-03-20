import './style.css';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { projectController } from './controllers/projectController';
import { activeProjectService } from './services/activeProjectService';
import { storyController } from './controllers/storyController';
import { taskController } from './controllers/taskController';
import type { StoryStatus, StoryPriority, TaskStatus } from './types';

// ── State ──
let statusFilter: StoryStatus | 'all' = 'all';
let editingStoryId: string | null = null;
let selectedTaskId: string | null = null;
let editingTaskId: string | null = null;

// ── Helpers ──
const app = document.querySelector<HTMLDivElement>('#app')!;

function getLoggedUser() {
  const state = authService.getState();
  if (!state.isLoggedIn || !state.userId) return null;
  return userService.getCurrentUser();
}

const priorityLabels: Record<StoryPriority, string> = { low: 'Niski', medium: 'Średni', high: 'Wysoki' };
const statusLabels: Record<StoryStatus, string> = { todo: 'Do zrobienia', 'in-progress': 'W trakcie', done: 'Gotowe' };
const taskStatusLabels: Record<TaskStatus, string> = { todo: 'Do zrobienia', 'in-progress': 'W trakcie', done: 'Gotowe' };

// ── Render ──
function render() {
  const user = getLoggedUser();
  const projects = projectController.list();
  const activeProject = activeProjectService.getActiveProject();
  const stories = activeProject ? storyController.listByProject(activeProject.id) : [];
  const filtered = statusFilter === 'all' ? stories : stories.filter(s => s.status === statusFilter);

  // Jeśli oglądamy szczegóły zadania
  if (selectedTaskId) {
    const task = taskController.detail(selectedTaskId);
    const story = storyController.detail(task.storyId);
    const project = activeProject;
    const assignee = userService.getUserById(task.assignedToId);

    app.innerHTML = `
      <header class="app-header">
        <h1>ManagMe</h1>
        <div class="user-info">
          ${user ? `<span>Zalogowany: <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong></span>` : '<span>Brak zalogowanego użytkownika</span>'}
        </div>
      </header>

      <section class="section">
        <button class="btn-back" id="back-to-tasks">← Powrót do historyjki</button>
        <h2>Szczegóły zadania</h2>
        
        <div class="task-detail">
          <div class="detail-row">
            <strong>Nazwa:</strong>
            <span>${escapeHtml(task.name)}</span>
          </div>
          <div class="detail-row">
            <strong>Opis:</strong>
            <span>${escapeHtml(task.description)}</span>
          </div>
          <div class="detail-row">
            <strong>Historyjka:</strong>
            <span>${escapeHtml(story.name)}</span>
          </div>
          <div class="detail-row">
            <strong>Projekt:</strong>
            <span>${project ? escapeHtml(project.name) : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <strong>Przypisana osoba:</strong>
            <span>${assignee ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)} (${assignee.role})` : 'Brak'}</span>
          </div>
          <div class="detail-row">
            <strong>Status:</strong>
            <span class="badge status-${task.status}">${taskStatusLabels[task.status]}</span>
          </div>
          <div class="detail-row">
            <strong>Data startu:</strong>
            <span>${new Date(task.startDate).toLocaleDateString('pl-PL')}</span>
          </div>
          <div class="detail-row">
            <strong>Zrealizowane roboczogodziny:</strong>
            <span>${task.workedHours} h</span>
          </div>
          <div class="detail-row">
            <strong>Utworzone:</strong>
            <span>${new Date(task.createdAt).toLocaleDateString('pl-PL')}</span>
          </div>
          <div class="detail-row">
            <strong>Ostatnia aktualizacja:</strong>
            <span>${new Date(task.updatedAt).toLocaleDateString('pl-PL')}</span>
          </div>
        </div>

        <div class="task-actions">
          <button class="btn-edit" id="edit-task-btn">Edytuj</button>
          <button class="btn-delete" id="delete-task-btn">Usuń</button>
        </div>
      </section>
    `;
    bindTaskDetailEvents();
    return;
  }

  // Główny widok
  app.innerHTML = `
    <header class="app-header">
      <h1>ManagMe</h1>
      <div class="user-info">
        ${user ? `<span>Zalogowany: <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong> (${user.role})</span>` : '<span>Brak zalogowanego użytkownika</span>'}
      </div>
    </header>

    <section class="section">
      <h2>Projekty</h2>
      <div class="project-selector">
        <select id="project-select">
          <option value="">-- Wybierz projekt --</option>
          ${projects.map(p => `<option value="${p.id}" ${activeProject?.id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      ${activeProject ? `<p class="active-label">Aktywny projekt: <strong>${escapeHtml(activeProject.name)}</strong></p>` : ''}
    </section>

    ${activeProject ? `
    <section class="section">
      <h2>Historyjki — ${escapeHtml(activeProject.name)}</h2>

      <div class="filter-bar">
        <button class="filter-btn ${statusFilter === 'all' ? 'active' : ''}" data-filter="all">Wszystkie</button>
        <button class="filter-btn ${statusFilter === 'todo' ? 'active' : ''}" data-filter="todo">Do zrobienia</button>
        <button class="filter-btn ${statusFilter === 'in-progress' ? 'active' : ''}" data-filter="in-progress">W trakcie</button>
        <button class="filter-btn ${statusFilter === 'done' ? 'active' : ''}" data-filter="done">Gotowe</button>
      </div>

      <div class="story-form-container">
        <h3>${editingStoryId ? 'Edytuj historyjkę' : 'Nowa historyjka'}</h3>
        <form id="story-form">
          <input type="hidden" id="story-id" value="${editingStoryId ?? ''}"/>
          <div class="form-row">
            <label>Nazwa</label>
            <input type="text" id="story-name" placeholder="Nazwa historyjki" required value="${editingStoryId ? escapeHtml(storyController.detail(editingStoryId).name) : ''}"/>
          </div>
          <div class="form-row">
            <label>Opis</label>
            <textarea id="story-desc" placeholder="Opis historyjki" required>${editingStoryId ? escapeHtml(storyController.detail(editingStoryId).description) : ''}</textarea>
          </div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>Priorytet</label>
              <select id="story-priority">
                ${(['low', 'medium', 'high'] as StoryPriority[]).map(p => `<option value="${p}" ${editingStoryId && storyController.detail(editingStoryId).priority === p ? 'selected' : ''}>${priorityLabels[p]}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <label>Stan</label>
              <select id="story-status">
                ${(['todo', 'in-progress', 'done'] as StoryStatus[]).map(s => `<option value="${s}" ${editingStoryId && storyController.detail(editingStoryId).status === s ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit">${editingStoryId ? 'Zapisz zmiany' : 'Dodaj'}</button>
            ${editingStoryId ? '<button type="button" id="cancel-edit">Anuluj</button>' : ''}
          </div>
        </form>
      </div>

      ${filtered.length === 0 ? '<p class="empty">Brak historyjek do wyświetlenia.</p>' : `
      <div class="story-list">
        ${filtered.map(s => `
        <div class="story-card priority-${s.priority}">
          <div class="story-header">
            <span class="story-name">${escapeHtml(s.name)}</span>
            <span class="badge status-${s.status}">${statusLabels[s.status]}</span>
          </div>
          <p class="story-desc">${escapeHtml(s.description)}</p>
          <div class="story-meta">
            <span class="badge priority-badge">${priorityLabels[s.priority]}</span>
            <span>${new Date(s.createdAt).toLocaleDateString('pl-PL')}</span>
          </div>
          
          <h4 style="margin-top: 1rem; margin-bottom: 0.5rem;">Zadania (${taskController.listByStory(s.id).length})</h4>
          ${taskController.listByStory(s.id).length === 0 ? '<p class="empty" style="font-size: 0.9rem;">Brak zadań</p>' : `
          <div class="task-list" style="margin-bottom: 1rem; border-top: 1px solid #eee; padding-top: 0.5rem;">
            ${taskController.listByStory(s.id).map(t => `
            <div class="task-item" style="padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; cursor: pointer;" data-task-id="${t.id}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${escapeHtml(t.name)}</span>
                <span class="badge status-${t.status}">${taskStatusLabels[t.status]}</span>
              </div>
              <small style="color: #666;">${userService.getUserById(t.assignedToId)?.firstName} ${userService.getUserById(t.assignedToId)?.lastName}</small>
            </div>
            `).join('')}
          </div>`}
          
          <div class="story-actions">
            <button class="btn-edit" data-id="${s.id}">Edytuj historyjkę</button>
            <button class="btn-delete" data-id="${s.id}">Usuń</button>
            <button class="btn-new-task" data-story-id="${s.id}">+ Nowe zadanie</button>
          </div>
        </div>`).join('')}
      </div>`}
    </section>` : '<p class="empty">Wybierz projekt, aby zobaczyć historyjki.</p>'}
  `;

  bindEvents();
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Events ──
function bindTaskDetailEvents() {
  // Back button
  document.getElementById('back-to-tasks')?.addEventListener('click', () => {
    selectedTaskId = null;
    editingTaskId = null;
    render();
  });

  // Edit button
  document.getElementById('edit-task-btn')?.addEventListener('click', () => {
    if (selectedTaskId) {
      editingTaskId = selectedTaskId;
      renderTaskEditForm();
    }
  });

  // Delete button
  document.getElementById('delete-task-btn')?.addEventListener('click', () => {
    if (selectedTaskId && confirm('Usunąć to zadanie?')) {
      try {
        taskController.remove(selectedTaskId);
        selectedTaskId = null;
        render();
      } catch (err) {
        alert((err as Error).message);
      }
    }
  });
}

function renderTaskEditForm() {
  if (!editingTaskId) return;

  const task = taskController.detail(editingTaskId);
  const story = storyController.detail(task.storyId);
  const users = userService.getAllUsers();

  app.innerHTML = `
    <header class="app-header">
      <h1>ManagMe</h1>
      <div class="user-info">
        ${getLoggedUser() ? `<span>Zalogowany: <strong>${escapeHtml(getLoggedUser()!.firstName)} ${escapeHtml(getLoggedUser()!.lastName)}</strong></span>` : '<span>Brak zalogowanego użytkownika</span>'}
      </div>
    </header>

    <section class="section">
      <button class="btn-back" id="back-to-task-detail">← Powrót do szczegółów</button>
      <h2>${editingTaskId ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>
      
      <form id="task-form">
        <input type="hidden" id="task-id" value="${editingTaskId ?? ''}"/>
        <div class="form-row">
          <label>Nazwa</label>
          <input type="text" id="task-name" placeholder="Nazwa zadania" required value="${escapeHtml(task.name)}"/>
        </div>
        <div class="form-row">
          <label>Opis</label>
          <textarea id="task-desc" placeholder="Opis zadania" required>${escapeHtml(task.description)}</textarea>
        </div>
        <div class="form-row">
          <label>Historyjka</label>
          <input type="text" disabled value="${escapeHtml(story.name)}"/>
        </div>
        <div class="form-row">
          <label>Przypisana osoba</label>
          <select id="task-assignee">
            ${users.map(u => `<option value="${u.id}" ${task.assignedToId === u.id ? 'selected' : ''}>${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} (${u.role})</option>`).join('')}
          </select>
        </div>
        <div class="form-row-inline">
          <div class="form-row">
            <label>Status</label>
            <select id="task-status">
              ${(['todo', 'in-progress', 'done'] as TaskStatus[]).map(s => `<option value="${s}" ${task.status === s ? 'selected' : ''}>${taskStatusLabels[s]}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <label>Roboczogodziny</label>
            <input type="number" id="task-hours" min="0" step="0.5" value="${task.workedHours}"/>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit">Zapisz</button>
          <button type="button" id="cancel-task-edit">Anuluj</button>
        </div>
      </form>
    </section>
  `;
  bindTaskFormEvents();
}

function bindTaskFormEvents() {
  document.getElementById('back-to-task-detail')?.addEventListener('click', () => {
    editingTaskId = null;
    render();
  });

  document.getElementById('cancel-task-edit')?.addEventListener('click', () => {
    editingTaskId = null;
    render();
  });

  document.getElementById('task-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('task-name') as HTMLInputElement).value;
    const desc = (document.getElementById('task-desc') as HTMLTextAreaElement).value;
    const assignedToId = (document.getElementById('task-assignee') as HTMLSelectElement).value;
    const status = (document.getElementById('task-status') as HTMLSelectElement).value as TaskStatus;
    const workedHours = parseFloat((document.getElementById('task-hours') as HTMLInputElement).value) || 0;

    try {
      if (editingTaskId) {
        taskController.update(editingTaskId, { name, description: desc, assignedToId, status, workedHours });
        selectedTaskId = editingTaskId;
      }
      editingTaskId = null;
      render();
    } catch (err) {
      alert((err as Error).message);
    }
  });
}

function bindEvents() {
  // Project selector
  document.getElementById('project-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val) {
      activeProjectService.setActiveProject(val);
    } else {
      activeProjectService.clearActiveProject();
    }
    statusFilter = 'all';
    editingStoryId = null;
    selectedTaskId = null;
    render();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      statusFilter = (btn as HTMLElement).dataset.filter as StoryStatus | 'all';
      render();
    });
  });

  // Story form
  document.getElementById('story-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('story-name') as HTMLInputElement).value;
    const desc = (document.getElementById('story-desc') as HTMLTextAreaElement).value;
    const priority = (document.getElementById('story-priority') as HTMLSelectElement).value as StoryPriority;
    const status = (document.getElementById('story-status') as HTMLSelectElement).value as StoryStatus;
    const id = (document.getElementById('story-id') as HTMLInputElement).value;

    const activeProject = activeProjectService.getActiveProject();
    const user = getLoggedUser();
    if (!activeProject || !user) return;

    try {
      if (id) {
        storyController.update(id, { name, description: desc, priority, status });
      } else {
        storyController.create({
          name,
          description: desc,
          priority,
          status,
          projectId: activeProject.id,
          ownerId: user.id,
        });
      }
      editingStoryId = null;
      render();
    } catch (err) {
      alert((err as Error).message);
    }
  });

  // Cancel edit
  document.getElementById('cancel-edit')?.addEventListener('click', () => {
    editingStoryId = null;
    render();
  });

  // Edit story buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      editingStoryId = (btn as HTMLElement).dataset.id!;
      render();
    });
  });

  // Delete story buttons
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      if (confirm('Usunąć tę historyjkę?')) {
        try {
          storyController.remove(id);
          render();
        } catch (err) {
          alert((err as Error).message);
        }
      }
    });
  });

  // New task buttons
  document.querySelectorAll('.btn-new-task').forEach(btn => {
    btn.addEventListener('click', () => {
      const storyId = (btn as HTMLElement).dataset.storyId!;
      const user = getLoggedUser();
      if (!user) return;

      try {
        const newTask = taskController.create({
          name: 'Nowe zadanie',
          description: 'Opis zadania',
          storyId,
          assignedToId: user.id,
        });
        selectedTaskId = newTask.id;
        editingTaskId = newTask.id;
        renderTaskEditForm();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  });

  // Task item clicks
  document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', () => {
      const taskId = (item as HTMLElement).dataset.taskId!;
      selectedTaskId = taskId;
      render();
    });
  });
}

// ── Init ──
activeProjectService.ensureActiveProjectStillExists();
render();
