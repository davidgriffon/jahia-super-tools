// Loaded before every spec: Jahia commands (login, logout, apollo, executeGroovy...) and shared helpers.
import './helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('cypress-terminal-report/src/installLogsCollector')();
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@jahia/cypress/dist/support/registerSupport').registerSupport();

// The tools pages embed third-party scripts (CSRF guard, MUI) whose incidental errors must not fail a test.
Cypress.on('uncaught:exception', () => false);
