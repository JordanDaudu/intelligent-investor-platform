import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Default to the Docker Compose frontend port (5173) so `cypress:run` works
    // out of the box against `docker compose up`. Override with CYPRESS_BASE_URL
    // to point at the Vite dev server on port 5000.
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:5173',
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx,js,jsx}',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
  },
});
