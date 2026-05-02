/// <reference types="cypress" />

/**
 * E2E happy path: enter values → see buckets + chart → save → reload → still saved.
 *
 * Requires the full stack to be running (backend + frontend + database). Run with:
 *   docker compose up --build
 *   pnpm --prefix frontend cypress:run
 */
describe('Intelligent Investor — happy path', () => {
  const uniqueName = `Cypress Tester ${Date.now()}`;

  it('saves a profile and persists it across reload', () => {
    cy.visit('/');

    cy.contains('label', 'Name').find('input').type(uniqueName);
    cy.contains('label', 'Gross monthly salary').find('input').type('20000');
    cy.contains('button', 'Estimate').click();

    cy.get('[data-testid="bucket-fixed-amount"]').should('contain', '$7,480.00');
    cy.get('[data-testid="bucket-savings-amount"]').should('contain', '$1,360.00');
    cy.get('[data-testid="bucket-investments-amount"]').should('contain', '$1,360.00');
    cy.get('[data-testid="bucket-guilt-amount"]').should('contain', '$3,740.00');
    cy.get('[data-testid="projection-chart"]').should('exist');

    cy.contains('button', 'Save profile').click();
    cy.get('[data-testid="profile-list"]').should('contain', uniqueName);

    cy.reload();
    cy.get('[data-testid="profile-list"]').should('contain', uniqueName);
  });
});
