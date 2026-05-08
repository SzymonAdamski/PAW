import { createProject, getStoredItems, visitSeededApp } from '../support/e2eHelpers';

const originalProjectName = 'Projekt E2E';
const updatedProjectName = 'Projekt E2E po edycji';

describe('project flow', () => {
  beforeEach(() => {
    visitSeededApp();
  });

  it('creates, edits and deletes a project', () => {
    cy.contains('h1', 'ManagMe').should('be.visible');

    createProject(originalProjectName, 'Opis projektu E2E do testow.');

    cy.contains('.project-item', originalProjectName).within(() => {
      cy.contains('button', 'Edytuj').click();
    });

    cy.get('#project-name').clear().type(updatedProjectName);
    cy.get('#project-description').clear().type('Opis projektu po edycji.');
    cy.get('#project-form').submit();

    cy.contains('.project-item', updatedProjectName).should('be.visible');
    cy.contains('h2', updatedProjectName).should('be.visible');
    cy.contains('Opis projektu po edycji.').should('be.visible');

    cy.contains('.project-item', updatedProjectName).within(() => {
      cy.contains('button', 'Usun').click();
    });

    cy.contains(updatedProjectName).should('not.exist');
    cy.contains('Brak projektow.').should('be.visible');
    getStoredItems('projects').should('have.length', 0);
  });
});
