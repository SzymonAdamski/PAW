import { createProject, createStory, developerUser, getStoredItems, visitSeededApp } from '../support/e2eHelpers';

const projectName = 'Projekt dla zadan E2E';
const storyName = 'Historyjka dla zadan E2E';
const originalTaskName = 'Zadanie E2E';
const updatedTaskName = 'Zadanie E2E po edycji';

describe('task flow', () => {
  beforeEach(() => {
    visitSeededApp();
    createProject(projectName, 'Opis projektu z zadaniami E2E.');
    createStory(storyName, 'Opis historyjki z zadaniami E2E.');
  });

  it('creates, changes status, edits and deletes a task', () => {
    cy.contains('.story-card', storyName).within(() => {
      cy.contains('button', 'Nowe zadanie').click();
    });

    cy.get('#task-name').type(originalTaskName);
    cy.get('#task-description').type('Opis zadania E2E.');
    cy.get('#task-priority').select('medium');
    cy.get('#task-status').select('todo');
    cy.get('#task-estimated-hours').clear().type('2');
    cy.get('#task-worked-hours').clear().type('0.5');
    cy.get('#task-assignee').select(developerUser.id);
    cy.get('#task-form').submit();

    cy.contains('h2', 'Szczegoly zadania').should('be.visible');
    cy.contains(originalTaskName).should('be.visible');
    cy.contains('Todo').should('be.visible');

    cy.get('#task-mark-done').click();
    cy.contains('.badge.status-done', 'Done').should('be.visible');

    cy.get('#task-edit').click();
    cy.get('#task-name').clear().type(updatedTaskName);
    cy.get('#task-description').clear().type('Opis zadania po edycji.');
    cy.get('#task-priority').select('high');
    cy.get('#task-worked-hours').clear().type('2');
    cy.get('#task-form').submit();

    cy.contains(updatedTaskName).should('be.visible');
    cy.contains('Opis zadania po edycji.').should('be.visible');

    cy.get('#task-delete').click();

    cy.contains('h2', projectName).should('be.visible');
    cy.contains(updatedTaskName).should('not.exist');
    getStoredItems('tasks').should('have.length', 0);
  });
});
