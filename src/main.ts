import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import { appConfig, getConfigurationErrors } from './config';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { projectController } from './controllers/projectController';
import { activeProjectService } from './services/activeProjectService';
import { storyController } from './controllers/storyController';
import { taskController } from './controllers/taskController';
import { initializeDataServices } from './services/dataInitialization';
import { notificationService } from './services/notificationService';
import { clearGoogleAutoSelect, renderGoogleSignInButton } from './services/googleIdentityService';
import type { StoryStatus, StoryPriority, TaskStatus, TaskPriority, Task, Notification, NotificationPriority, UserRole } from './types';

// State
type AppView = 'dashboard' | 'notifications' | 'notification-detail' | 'users';
type AccessGate = 'app' | 'login' | 'blocked' | 'pending' | 'config-error';

let appView: AppView = 'dashboard';
let statusFilter: StoryStatus | 'all' = 'all';
let editingStoryId: string | null = null;
let selectedTaskId: string | null = null;
let taskFormState: { mode: 'create'; storyId: string } | { mode: 'edit'; storyId: string; taskId: string } | null = null;
let selectedNotificationId: string | null = null;
let authErrorMessage: string | null = null;
let isAuthBusy = false;
let usersManagementMessage: string | null = null;
const notificationDialogQueue: Notification[] = [];

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

const notificationPriorityLabels: Record<NotificationPriority, string> = {
  low: 'Niski',
  medium: 'Sredni',
  high: 'Wysoki',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  devops: 'DevOps',
  developer: 'Developer',
  guest: 'Gosc',
};

const editableRoles: UserRole[] = ['admin', 'devops', 'developer', 'guest'];

type AppTheme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'app-theme';
let currentTheme: AppTheme = getInitialTheme();

function resetTransientViewState(): void {
  appView = 'dashboard';
  statusFilter = 'all';
  editingStoryId = null;
  selectedTaskId = null;
  taskFormState = null;
  selectedNotificationId = null;
  usersManagementMessage = null;
  notificationDialogQueue.length = 0;
}

function getLoggedUser() {
  const state = authService.getState();
  if (!state.isLoggedIn || !state.userId) {
    return null;
  }

  return userService.getUserById(state.userId) ?? null;
}

function getAccessGate(): AccessGate {
  const configErrors = getConfigurationErrors();
  if (configErrors.length > 0) {
    return 'config-error';
  }

  const state = authService.getState();
  if (!state.isLoggedIn || !state.userId) {
    return 'login';
  }

  const user = userService.getUserById(state.userId);
  if (!user) {
    authService.clearLoggedUser();
    return 'login';
  }

  if (user.blocked) {
    return 'blocked';
  }

  if (user.role === 'guest') {
    return 'pending';
  }

  return 'app';
}

function getUnreadNotificationsCount(): number {
  const user = getLoggedUser();
  if (!user) {
    return 0;
  }

  return notificationService.countUnreadByRecipient(user.id);
}

function openNotificationsList(): void {
  appView = 'notifications';
  selectedNotificationId = null;
  usersManagementMessage = null;
  render();
}

function openDashboard(): void {
  appView = 'dashboard';
  selectedNotificationId = null;
  selectedTaskId = null;
  taskFormState = null;
  usersManagementMessage = null;
  render();
}

function openUsersList(): void {
  appView = 'users';
  selectedNotificationId = null;
  selectedTaskId = null;
  taskFormState = null;
  usersManagementMessage = null;
  render();
}

function openNotificationDetail(notificationId: string): void {
  removeNotificationFromDialogQueue(notificationId);
  selectedNotificationId = notificationId;
  appView = 'notification-detail';
  render();
}

function closeCurrentDialogNotification(): void {
  notificationDialogQueue.shift();
}

function handleLogout(): void {
  authService.clearLoggedUser();
  clearGoogleAutoSelect();
  authErrorMessage = null;
  isAuthBusy = false;
  resetTransientViewState();
  render();
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
  const unreadCount = getUnreadNotificationsCount();

  return `
    <header class="app-header">
      <h1>ManagMe</h1>
      <div class="header-actions">
        <nav class="header-menu">
          <button id="menu-dashboard-link" class="btn btn-sm btn-outline-secondary" type="button">Pulpit</button>
          <button id="notifications-menu-link" class="btn btn-sm btn-outline-secondary" type="button">Powiadomienia</button>
          ${user?.role === 'admin' ? '<button id="menu-users-link" class="btn btn-sm btn-outline-secondary" type="button">Uzytkownicy</button>' : ''}
        </nav>
        <div class="user-info">
          ${user
            ? `<span>Zalogowany: <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong> (${roleLabels[user.role]})</span>
               <button id="notification-counter-link" type="button" class="notification-counter-btn" aria-label="Nieprzeczytane powiadomienia">
                 <span>Nieprzeczytane</span>
                 <span class="notification-counter-badge">${unreadCount}</span>
               </button>
               <button id="header-logout-link" type="button" class="btn btn-sm btn-outline-secondary">Wyloguj</button>`
            : '<span>Brak zalogowanego uzytkownika</span>'}
        </div>
        <button id="theme-toggle" class="btn btn-sm btn-outline-secondary" type="button"></button>
      </div>
    </header>
  `;
}

function renderNotificationDialog(): string {
  const notification = notificationDialogQueue[0];
  if (!notification) {
    return '';
  }

  return `
    <div class="notification-dialog" role="dialog" aria-modal="true" aria-label="Nowe powiadomienie">
      <div class="notification-dialog-header">
        <strong>Nowe powiadomienie</strong>
        <span class="notification-priority-badge priority-${notification.priority}">${notificationPriorityLabels[notification.priority]}</span>
      </div>
      <h3>${escapeHtml(notification.title)}</h3>
      <p>${escapeHtml(notification.message)}</p>
      <p class="muted">Data: ${formatDate(notification.date)}</p>
      <div class="notification-dialog-actions">
        <button id="notification-dialog-open" class="primary" type="button">Szczegoly</button>
        <button id="notification-dialog-close" type="button">Zamknij</button>
      </div>
    </div>
  `;
}

function bindHeaderEvents(): void {
  document.getElementById('menu-dashboard-link')?.addEventListener('click', () => {
    openDashboard();
  });

  document.getElementById('notifications-menu-link')?.addEventListener('click', () => {
    openNotificationsList();
  });

  document.getElementById('menu-users-link')?.addEventListener('click', () => {
    openUsersList();
  });

  document.getElementById('notification-counter-link')?.addEventListener('click', () => {
    openNotificationsList();
  });

  document.getElementById('header-logout-link')?.addEventListener('click', () => {
    handleLogout();
  });
}

function bindNotificationDialogEvents(): void {
  document.getElementById('notification-dialog-close')?.addEventListener('click', () => {
    closeCurrentDialogNotification();
    render();
  });

  document.getElementById('notification-dialog-open')?.addEventListener('click', () => {
    const currentNotification = notificationDialogQueue[0];
    if (!currentNotification) {
      return;
    }

    closeCurrentDialogNotification();
    openNotificationDetail(currentNotification.id);
  });
}

function renderPage(content: string): void {
  app!.innerHTML = `${buildHeader()}${content}${renderNotificationDialog()}`;
  bindHeaderEvents();
  bindThemeToggle();
  bindNotificationDialogEvents();
  updateThemeButtonLabel();
}

function renderGatePage(content: string): void {
  app!.innerHTML = content;

  document.getElementById('auth-logout-btn')?.addEventListener('click', () => {
    handleLogout();
  });
}

async function handleGoogleCredential(credential: string): Promise<void> {
  if (isAuthBusy) {
    return;
  }

  isAuthBusy = true;
  authErrorMessage = null;
  render();

  try {
    await authService.signInWithGoogleCredential(credential);
    resetTransientViewState();
  } catch (error) {
    authErrorMessage = (error as Error).message;
  }

  isAuthBusy = false;
  render();
}

function renderConfigErrorView(): void {
  const errors = getConfigurationErrors();

  const content = `
    <section class="auth-shell">
      <article class="auth-card">
        <h1>Blad konfiguracji aplikacji</h1>
        <p>Ustaw wymagane zmienne srodowiskowe, aby uruchomic logowanie.</p>
        <ul class="auth-error-list">
          ${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
        </ul>
      </article>
    </section>
  `;

  renderGatePage(content);
}

function renderLoginView(): void {
  const content = `
    <section class="auth-shell">
      <article class="auth-card">
        <h1>Logowanie</h1>
        <p>Zaloguj sie przez Google, aby uzyskac dostep do aplikacji.</p>
        <div id="google-signin-button" class="google-signin-slot"></div>
        ${isAuthBusy ? '<p class="auth-muted">Trwa logowanie...</p>' : ''}
        ${authErrorMessage ? `<p class="auth-error" role="alert">${escapeHtml(authErrorMessage)}</p>` : ''}
      </article>
    </section>
  `;

  renderGatePage(content);

  const container = document.getElementById('google-signin-button');
  if (!container || isAuthBusy) {
    return;
  }

  renderGoogleSignInButton(container, appConfig.googleClientId, (credential) => {
    void handleGoogleCredential(credential);
  }).catch((error) => {
    authErrorMessage = (error as Error).message;
    render();
  });
}

function renderBlockedView(): void {
  const user = getLoggedUser();

  const content = `
    <section class="auth-shell">
      <article class="auth-card">
        <h1>Konto zablokowane</h1>
        <p>
          ${user ? `Konto ${escapeHtml(user.email)} jest obecnie zablokowane.` : 'To konto jest obecnie zablokowane.'}
        </p>
        <p>Skontaktuj sie z administratorem systemu.</p>
        <button id="auth-logout-btn" class="btn btn-outline-secondary" type="button">Wyloguj</button>
      </article>
    </section>
  `;

  renderGatePage(content);
}

function renderPendingApprovalView(): void {
  const user = getLoggedUser();

  const content = `
    <section class="auth-shell">
      <article class="auth-card">
        <h1>Oczekiwanie na zatwierdzenie konta</h1>
        <p>
          ${user ? `Konto ${escapeHtml(user.email)} oczekuje na nadanie roli przez administratora.` : 'Twoje konto oczekuje na zatwierdzenie.'}
        </p>
        <p>Po nadaniu roli dostep do aplikacji zostanie odblokowany.</p>
        <button id="auth-logout-btn" class="btn btn-outline-secondary" type="button">Wyloguj</button>
      </article>
    </section>
  `;

  renderGatePage(content);
}

function render(): void {
  const gate = getAccessGate();

  if (gate === 'config-error') {
    renderConfigErrorView();
    return;
  }

  if (gate === 'login') {
    renderLoginView();
    return;
  }

  if (gate === 'blocked') {
    renderBlockedView();
    return;
  }

  if (gate === 'pending') {
    renderPendingApprovalView();
    return;
  }

  if (appView === 'users') {
    const user = getLoggedUser();
    if (user?.role === 'admin') {
      renderUsersList();
      return;
    }

    appView = 'dashboard';
  }

  if (appView === 'notifications') {
    renderNotificationsList();
    return;
  }

  if (appView === 'notification-detail') {
    if (!selectedNotificationId) {
      appView = 'notifications';
      renderNotificationsList();
      return;
    }

    renderNotificationDetail(selectedNotificationId);
    return;
  }

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

function renderUsersList(): void {
  const currentUser = getLoggedUser();
  if (!currentUser || currentUser.role !== 'admin') {
    openDashboard();
    return;
  }

  const users = userService
    .getAllUsers()
    .sort((a, b) => a.email.localeCompare(b.email, 'pl-PL'));

  const content = `
    <section class="section">
      <button class="back-btn" id="users-back-to-dashboard">Powrot</button>
      <h2>Uzytkownicy</h2>
      <p class="muted">Widok dostepny tylko dla administratorow.</p>
      ${usersManagementMessage ? `<p class="users-feedback">${escapeHtml(usersManagementMessage)}</p>` : ''}
      <div class="users-table-wrapper">
        <table class="users-table">
          <thead>
            <tr>
              <th>Imie i nazwisko</th>
              <th>Email</th>
              <th>Rola</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map((user) => {
                const fullName = `${user.firstName} ${user.lastName}`.trim();
                const roleOptions = editableRoles
                  .map((role) => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${roleLabels[role]}</option>`)
                  .join('');

                return `
                  <tr class="${user.blocked ? 'is-blocked' : ''}">
                    <td>${escapeHtml(fullName || '-')}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td>
                      <select id="user-role-${user.id}" class="users-role-select" data-user-id="${user.id}">
                        ${roleOptions}
                      </select>
                    </td>
                    <td>
                      <span class="users-status ${user.blocked ? 'blocked' : 'active'}">
                        ${user.blocked ? 'Zablokowany' : 'Aktywny'}
                      </span>
                    </td>
                    <td class="users-actions">
                      <button type="button" class="js-user-role-apply" data-user-id="${user.id}">Zmien role</button>
                      <button type="button" class="${user.blocked ? 'primary' : 'danger'} js-user-toggle-block" data-user-id="${user.id}" data-blocked="${user.blocked}">
                        ${user.blocked ? 'Odblokuj' : 'Zablokuj'}
                      </button>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  renderPage(content);
  bindUsersListEvents();
}

function bindUsersListEvents(): void {
  document.getElementById('users-back-to-dashboard')?.addEventListener('click', () => {
    openDashboard();
  });

  document.querySelectorAll<HTMLElement>('.js-user-role-apply').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.userId;
      if (!userId) {
        return;
      }

      const roleSelect = document.getElementById(`user-role-${userId}`) as HTMLSelectElement | null;
      if (!roleSelect) {
        return;
      }

      const nextRole = roleSelect.value as UserRole;

      try {
        const updated = await userService.updateUserAccess(userId, { role: nextRole });
        usersManagementMessage = `Zmieniono role uzytkownika ${updated.email} na ${roleLabels[updated.role]}.`;
        render();
      } catch (error) {
        alert((error as Error).message);
      }
    });
  });

  document.querySelectorAll<HTMLElement>('.js-user-toggle-block').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.userId;
      const isBlocked = button.dataset.blocked === 'true';

      if (!userId) {
        return;
      }

      try {
        const updated = await userService.updateUserAccess(userId, { blocked: !isBlocked });
        usersManagementMessage = updated.blocked
          ? `Uzytkownik ${updated.email} zostal zablokowany.`
          : `Uzytkownik ${updated.email} zostal odblokowany.`;
        render();
      } catch (error) {
        alert((error as Error).message);
      }
    });
  });
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

function renderNotificationsList(): void {
  const user = getLoggedUser();

  const content = `
    <section class="section">
      <button class="back-btn" id="notifications-back-to-dashboard">Powrot</button>
      <h2>Powiadomienia</h2>
      ${
        !user
          ? '<p class="empty">Brak zalogowanego uzytkownika.</p>'
          : renderNotificationsListContent(user.id)
      }
    </section>
  `;

  renderPage(content);
  bindNotificationsListEvents();
}

function renderNotificationsListContent(userId: string): string {
  const notifications = notificationService.listByRecipient(userId);

  if (notifications.length === 0) {
    return '<p class="empty">Brak powiadomien.</p>';
  }

  return `
    <div class="notification-list">
      ${notifications
        .map(
          (notification) => `
            <article class="notification-item ${notification.isRead ? 'is-read' : 'is-unread'}">
              <div class="notification-item-header">
                <h3>${escapeHtml(notification.title)}</h3>
                <span class="notification-priority-badge priority-${notification.priority}">
                  ${notificationPriorityLabels[notification.priority]}
                </span>
              </div>
              <p class="notification-item-message">${escapeHtml(notification.message)}</p>
              <div class="notification-item-meta">
                <span>Data: ${formatDate(notification.date)}</span>
                <span>Status: ${notification.isRead ? 'Przeczytane' : 'Nieprzeczytane'}</span>
              </div>
              <div class="notification-item-actions">
                <button type="button" class="primary js-notification-open" data-notification-id="${notification.id}">
                  Szczegoly
                </button>
                <button
                  type="button"
                  class="js-notification-mark-read"
                  data-notification-id="${notification.id}"
                  ${notification.isRead ? 'disabled' : ''}
                >
                  Oznacz jako przeczytane
                </button>
              </div>
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderNotificationDetail(notificationId: string): void {
  const user = getLoggedUser();
  if (!user) {
    appView = 'notifications';
    renderNotificationsList();
    return;
  }

  const notification = notificationService.getById(notificationId);
  if (!notification || notification.recipientId !== user.id) {
    appView = 'notifications';
    selectedNotificationId = null;
    renderNotificationsList();
    return;
  }

  if (!notification.isRead) {
    void markNotificationAsRead(notification.id);
  }

  const nextNotification = notificationService.getById(notificationId);
  if (!nextNotification) {
    appView = 'notifications';
    selectedNotificationId = null;
    renderNotificationsList();
    return;
  }

  const content = `
    <section class="section">
      <button class="back-btn" id="notification-detail-back">Powrot do listy</button>
      <h2>Szczegoly powiadomienia</h2>

      <article class="notification-detail priority-${nextNotification.priority}">
        <div class="notification-item-header">
          <h3>${escapeHtml(nextNotification.title)}</h3>
          <span class="notification-priority-badge priority-${nextNotification.priority}">
            ${notificationPriorityLabels[nextNotification.priority]}
          </span>
        </div>
        <p class="notification-detail-message">${escapeHtml(nextNotification.message)}</p>
        <div class="notification-item-meta">
          <span>Data: ${formatDate(nextNotification.date)}</span>
          <span>Status: ${nextNotification.isRead ? 'Przeczytane' : 'Nieprzeczytane'}</span>
        </div>
      </article>

      <div class="task-detail-actions">
        <button id="notification-detail-mark-read" type="button">
          Oznacz jako przeczytane
        </button>
      </div>
    </section>
  `;

  renderPage(content);
  bindNotificationDetailEvents(nextNotification.id);
}

function bindNotificationsListEvents(): void {
  document.getElementById('notifications-back-to-dashboard')?.addEventListener('click', () => {
    openDashboard();
  });

  document.querySelectorAll<HTMLElement>('.js-notification-open').forEach((button) => {
    button.addEventListener('click', () => {
      const notificationId = button.dataset.notificationId;
      if (!notificationId) {
        return;
      }

      openNotificationDetail(notificationId);
    });
  });

  document.querySelectorAll<HTMLElement>('.js-notification-mark-read').forEach((button) => {
    button.addEventListener('click', async () => {
      const notificationId = button.dataset.notificationId;
      if (!notificationId) {
        return;
      }

      await markNotificationAsRead(notificationId);
      render();
    });
  });
}

function bindNotificationDetailEvents(notificationId: string): void {
  document.getElementById('notification-detail-back')?.addEventListener('click', () => {
    openNotificationsList();
  });

  document.getElementById('notification-detail-mark-read')?.addEventListener('click', async () => {
    await markNotificationAsRead(notificationId);
    render();
  });
}

function removeNotificationFromDialogQueue(notificationId: string): void {
  const index = notificationDialogQueue.findIndex((notification) => notification.id === notificationId);
  if (index >= 0) {
    notificationDialogQueue.splice(index, 1);
  }
}

async function markNotificationAsRead(notificationId: string): Promise<void> {
  await notificationService.markAsRead(notificationId);
  removeNotificationFromDialogQueue(notificationId);
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
        <div><strong>Przypisana osoba:</strong> ${assignee ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)} (${roleLabels[assignee.role]})` : 'Brak'}</div>
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
                  `<option value="${user.id}" ${task.assignedToId === user.id ? 'selected' : ''}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)} (${roleLabels[user.role]})</option>`,
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
                `<option value="${user.id}" ${task?.assignedToId === user.id ? 'selected' : ''}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)} (${roleLabels[user.role]})</option>`,
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

  document.getElementById('story-form')?.addEventListener('submit', async (event) => {
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
        await storyController.update(storyId, {
          name,
          description,
          priority,
          status,
        });
      } else {
        await storyController.create({
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
    button.addEventListener('click', async () => {
      const storyId = button.dataset.storyId;

      if (!storyId) {
        return;
      }

      if (!confirm('Usunac te historyjke?')) {
        return;
      }

      try {
        await storyController.remove(storyId);
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

  document.getElementById('task-delete')?.addEventListener('click', async () => {
    if (!confirm('Usunac to zadanie?')) {
      return;
    }

    try {
      await taskController.remove(taskId);
      selectedTaskId = null;
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  document.getElementById('task-assignee-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const assigneeId = (document.getElementById('task-assignee-select') as HTMLSelectElement).value;

    if (!assigneeId) {
      alert('Wybierz osobe do przypisania.');
      return;
    }

    try {
      await taskController.assignUser(taskId, assigneeId);
      render();
    } catch (error) {
      alert((error as Error).message);
    }
  });

  document.getElementById('task-mark-done')?.addEventListener('click', async () => {
    try {
      await taskController.markDone(taskId);
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

  document.getElementById('task-form')?.addEventListener('submit', async (event) => {
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
        const created = await taskController.create({
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
        await taskController.update(state.taskId, {
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

function bindNotificationCreatedListener(): void {
  notificationService.subscribe((notification) => {
    const user = getLoggedUser();
    if (!user) {
      return;
    }

    if (notification.recipientId !== user.id) {
      return;
    }

    if (notification.priority !== 'medium' && notification.priority !== 'high') {
      return;
    }

    notificationDialogQueue.push(notification);
    render();
  });
}

function renderStartupLoading(): void {
  app!.innerHTML = `
    <section class="auth-shell">
      <article class="auth-card">
        <h1>Ladowanie aplikacji</h1>
        <p>Trwa wczytywanie danych.</p>
      </article>
    </section>
  `;
}

function renderStartupError(error: unknown): void {
  app!.innerHTML = `
    <section class="auth-shell">
      <article class="auth-card">
        <h1>Blad inicjalizacji danych</h1>
        <p>${escapeHtml((error as Error).message || 'Nie mozna wczytac danych aplikacji.')}</p>
      </article>
    </section>
  `;
}

async function bootstrapApp(): Promise<void> {
  applyTheme(currentTheme);
  renderStartupLoading();

  if (getConfigurationErrors().length > 0) {
    render();
    return;
  }

  try {
    await initializeDataServices();
    activeProjectService.ensureActiveProjectStillExists();
    bindNotificationCreatedListener();
    render();
  } catch (error) {
    renderStartupError(error);
  }
}

void bootstrapApp();
