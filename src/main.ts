import './style.css';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { projectController } from './controllers/projectController';
import { activeProjectService } from './services/activeProjectService';
import { storyController } from './controllers/storyController';
import type { StoryStatus, StoryPriority } from './types';

// ── State ──
let statusFilter: StoryStatus | 'all' = 'all';
let editingStoryId: string | null = null;

// ── Helpers ──
const app = document.querySelector<HTMLDivElement>('#app')!;

function getLoggedUser() {
  const state = authService.getState();
  if (!state.isLoggedIn || !state.userId) return null;
  return userService.getCurrentUser();
}

const priorityLabels: Record<StoryPriority, string> = { low: 'Niski', medium: 'Średni', high: 'Wysoki' };
const statusLabels: Record<StoryStatus, string> = { todo: 'Do zrobienia', 'in-progress': 'W trakcie', done: 'Gotowe' };

// ── Render ──
function render() {
  const user = getLoggedUser();
  const projects = projectController.list();
  const activeProject = activeProjectService.getActiveProject();
  const stories = activeProject ? storyController.listByProject(activeProject.id) : [];

  const filtered = statusFilter === 'all' ? stories : stories.filter(s => s.status === statusFilter);

  app.innerHTML = `
    <header class="app-header">
      <h1>ManagMe</h1>
      <div class="user-info">
        ${user ? `<span>Zalogowany: <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong></span>` : '<span>Brak zalogowanego użytkownika</span>'}
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
          <div class="story-actions">
            <button class="btn-edit" data-id="${s.id}">Edytuj</button>
            <button class="btn-delete" data-id="${s.id}">Usuń</button>
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

  // Edit buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      editingStoryId = (btn as HTMLElement).dataset.id!;
      render();
    });
  });

  // Delete buttons
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
}

// ── Init ──
activeProjectService.ensureActiveProjectStillExists();
render();
