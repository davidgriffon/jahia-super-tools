/*
 * Assets usage checker (tools/assetsUsage.jsp): a plain JSP form that scans the active modules.
 */
import {PAGES, captureExports, exportedText} from '../support/helpers';

describe('Assets usage checker', () => {
    beforeEach(() => cy.login());
    afterEach(() => cy.logout());

    it('shows the form with its defaults', () => {
        cy.visit(PAGES.assetsUsage);
        cy.get('#searchPattern').should('be.visible').and('have.value', '/assets/');
        cy.get('#targetBundle').should('be.visible').and('have.value', 'assets');
        cy.get('input[type="submit"]').should('be.visible');
        cy.contains('Scanned').should('not.exist');
    });

    it('scans the modules for the default assets bundle', () => {
        cy.visit(PAGES.assetsUsage);
        cy.get('input[type="submit"]').click();
        cy.contains('p', 'active modules').should('be.visible').invoke('text').then(text => {
            const scanned = Number(/Scanned\s+(\d+)/.exec(text.replace(/\s+/g, ' '))[1]);
            expect(scanned, 'number of scanned modules').to.be.greaterThan(0);
        });
        // The assets module ships on every Jahia and its resources are used by the product modules.
        cy.contains('Global summary').should('be.visible');
        cy.get('table.st-table').first().find('tbody tr').should('have.length.greaterThan', 0);
        cy.get('table.st-table').first().find('.st-badge').first().should('contain', 'in assets');
        cy.contains('h2', 'Per-module breakdown').should('be.visible');
    });

    it('exports the scan report as CSV, JSON and XML without scanning again', () => {
        captureExports();
        cy.visit(PAGES.assetsUsage);
        cy.get('input[type="submit"]').click();
        cy.contains('Global summary').should('be.visible');
        cy.get('[data-test-id="export-csv"]').click();
        exportedText(0).should('contain', 'Module,Type,Resource,Usages in module,Used in file');
        cy.get('[data-test-id="export-json"]').click();
        exportedText(1).then(text => {
            const document = JSON.parse(text);
            expect(document.targetBundle).to.eq('assets');
            expect(document.summary.scannedModules).to.be.greaterThan(0);
            expect(document.resources).to.not.be.empty;
            expect(document.modules[0].resources[0].files).to.not.be.empty;
        });
        cy.get('[data-test-id="export-xml"]').click();
        exportedText(2).should('contain', '<assetsUsage>').and('contain', '<resource>');
    });

    it('warns when the target bundle is not active and still reports the references', () => {
        cy.visit(PAGES.assetsUsage);
        cy.get('#searchPattern').clear();
        cy.get('#searchPattern').type('/javascript/');
        cy.get('#targetBundle').clear();
        cy.get('#targetBundle').type('no-such-bundle-for-cypress');
        cy.get('input[type="submit"]').click();
        cy.get('.st-warning').should('contain', 'no-such-bundle-for-cypress').and('contain', 'is not active');
        cy.contains('p', 'active modules').should('contain', '/javascript/');
    });

    it('prefills the form from the URL but only scans on an explicit POST', () => {
        cy.visit(`${PAGES.assetsUsage}?scan=true&searchPattern=%2Ftools%2F&targetBundle=tools`);
        cy.get('#searchPattern').should('have.value', '/tools/');
        cy.get('#targetBundle').should('have.value', 'tools');
        cy.contains('active modules').should('not.exist');
        cy.get('input[type="submit"]').click();
        cy.contains('p', 'active modules').should('be.visible').and('contain', '/tools/');
        cy.get('form').should('have.attr', 'method', 'post');
    });
});
