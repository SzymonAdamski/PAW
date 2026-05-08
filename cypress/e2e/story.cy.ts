import { createProject, createStory, getStoredItems, visitSeededApp } from '../support/e2eHelpers';

const projectName = 'Projekt dla historyjek E2E';
const originalStoryName = 'Historyjka E2E';
const updatedStoryName = 'Historyjka E2E po edycji';

describe('story flow', () => {
  beforeEach(() => {
    visitSeededApp();
    createProject(projectName, 'Opis projektu z historyjkami E2E.');
  });

  it('creates, edits and deletes a story', () => {
    createStory(originalStoryName, 'Opis historyjki E2E.');

    cy.contains('.story-card', originalStoryName).within(() => {
      cy.contains('button', 'Edytuj historyjke').click();
    });

    cy.get('#story-name').clear().type(updatedStoryName);
    cy.get('#story-description').clear().type('Opis historyjki po edycji.');
    cy.get('#story-priority').select('medium');
    cy.get('#story-status').select('doing');
    cy.get('#story-form').submit();

    cy.contains('.story-card', updatedStoryName).should('be.visible');
    cy.contains('.story-card', updatedStoryName).should('contain', 'Opis historyjki po edycji.');
    cy.contains('.story-card', updatedStoryName).should('contain', 'Doing');

    cy.contains('.story-card', updatedStoryName).within(() => {
      cy.contains('button', 'Usun').click();
    });

    cy.contains(updatedStoryName).should('not.exist');
    getStoredItems('stories').should('have.length', 0);
  });
});
