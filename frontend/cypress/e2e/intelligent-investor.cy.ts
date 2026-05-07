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

    cy.contains('button', 'Save profile').click();
    cy.get('[data-testid="profile-list"]').should('contain', uniqueName);

    cy.reload();
    cy.get('[data-testid="profile-list"]').should('contain', uniqueName);
  });

  it('shows the Investment Projection section with Assignment Default badge', () => {
    cy.visit('/');

    cy.get('[data-testid="investment-projection"]').should('exist');
    cy.contains('h2', 'Investment Projection').should('exist');
    cy.get('[data-testid="projection-mode-badge"]').should('contain', 'Assignment Default');
  });

  it('switches to Scenario Mode when a slider is moved', () => {
    cy.visit('/');

    cy.get('[data-testid="investment-projection"]')
      .find('input[type="range"]')
      .first()
      .invoke('val', '0.10')
      .trigger('change');

    cy.get('[data-testid="projection-mode-badge"]').should('contain', 'Scenario Mode');
    cy.get('[data-testid="reset-to-default"]').should('exist');
  });

  it('shows Monthly Contribution Projection extra-credit card', () => {
    cy.visit('/');

    cy.contains('h2', 'Monthly Contribution Projection').should('exist');
    cy.get('[data-testid="monthly-contribution-projection"]').should('exist');
    cy.contains('.badge', 'Extra Credit').should('exist');
  });

  it('Monthly Contribution Projection has Annual return and Time horizon sliders', () => {
    cy.visit('/');

    cy.get('[data-testid="monthly-contribution-projection"]')
      .find('input[type="range"]')
      .should('have.length', 2);
  });

  it('defaults the active currency to ILS and exposes the four-currency selector', () => {
    cy.visit('/');

    cy.get('[data-testid="currency-selector"]').should('exist');
    cy.get('[data-testid="currency-selector"] select')
      .should('have.value', 'ILS');
    cy.get('[data-testid="currency-selector"] option').should('have.length', 4);
  });

  it('switching the currency to USD reformats bucket cards and persists per-profile after reload', () => {
    const usdName = `USD Tester ${Date.now()}`;
    cy.visit('/');

    cy.contains('label', 'Name').find('input').type(usdName);
    cy.contains('label', 'Gross monthly salary').find('input').type('20000');
    cy.contains('button', 'Estimate').click();

    // Switch to USD — typed bankNet (13600 ILS) converts to ~3675.68 USD.
    cy.get('[data-testid="currency-selector"] select').select('USD');
    cy.contains('label', 'Bank net').find('input').should('have.value', '3675.68');

    // Bucket card displays use $ now.
    cy.get('[data-testid="bucket-fixed-amount"]').should('contain', '$');

    // Save in USD and confirm the saved profile persists with currency context.
    cy.contains('button', 'Save profile').click();
    cy.get('[data-testid="profile-list"]').should('contain', usdName);

    cy.reload();
    cy.get('[data-testid="profile-list"]').should('contain', usdName);
  });
});
