type StoredEntity = {
  id: string;
};

export const adminUser = {
  id: 'e2e-admin',
  firstName: 'Admin',
  lastName: 'E2E',
  email: 'admin.e2e@example.com',
  role: 'admin',
  blocked: false,
  provider: 'google',
  providerUserId: 'google-admin-e2e',
};

export const developerUser = {
  id: 'e2e-developer',
  firstName: 'Dev',
  lastName: 'E2E',
  email: 'dev.e2e@example.com',
  role: 'developer',
  blocked: false,
  provider: 'google',
  providerUserId: 'google-dev-e2e',
};

export function seedStorage(win: Window): void {
  const { localStorage } = win;

  localStorage.clear();
  localStorage.setItem('users-migration-v2-done', '1');
  localStorage.setItem('users', JSON.stringify([adminUser, developerUser]));
  localStorage.setItem('logged-user-state', JSON.stringify({ userId: adminUser.id, isLoggedIn: true }));
  localStorage.setItem('active-project', JSON.stringify({ projectId: null }));
  localStorage.setItem('projects', JSON.stringify([]));
  localStorage.setItem('stories', JSON.stringify([]));
  localStorage.setItem('tasks', JSON.stringify([]));
  localStorage.setItem('notifications', JSON.stringify([]));
}

export function visitSeededApp(): void {
  cy.on('window:confirm', () => true);
  cy.visit('/', {
    onBeforeLoad: seedStorage,
  });
}

export function getStoredItems<T extends StoredEntity>(key: string): Cypress.Chainable<T[]> {
  return cy.window().then((win) => JSON.parse(win.localStorage.getItem(key) ?? '[]') as T[]);
}

export function createProject(name: string, description: string): void {
  cy.get('#project-new').click();
  cy.get('#project-name').type(name);
  cy.get('#project-description').type(description);
  cy.get('#project-form').submit();
  cy.contains('.project-item', name).should('be.visible');
  cy.contains('h2', name).should('be.visible');
}

export function createStory(name: string, description: string): void {
  cy.get('#story-name').type(name);
  cy.get('#story-description').type(description);
  cy.get('#story-priority').select('high');
  cy.get('#story-status').select('todo');
  cy.get('#story-form').submit();
  cy.contains('.story-card', name).should('be.visible');
}
