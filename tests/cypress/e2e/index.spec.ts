/*
 * The landing page of the module and its registration in the Support Tools home page.
 */
import {MODULE_BASE, PAGES} from '../support/helpers';

describe('Jahia Super Tools landing page', () => {
    beforeEach(() => cy.login());
    afterEach(() => cy.logout());

    it('lists the five tools and every link answers 200', () => {
        cy.visit(PAGES.index);
        cy.get('h1').should('contain', 'Jahia Super Tools');
        cy.get('.st-tool-card').should('have.length', 5);
        cy.get('.st-tool-card h2 a').each($link => {
            const href = $link.attr('href');
            cy.request({url: `${MODULE_BASE}/${href}`, failOnStatusCode: false}).its('status').should('eq', 200);
        });
    });

    it('is listed in the Modules section of the Support Tools home page', () => {
        cy.visit('/modules/tools/index.jsp');
        ['jcrBrowser', 'cacheBrowser', 'permissionTester', 'assetsUsage', 'springBeanEditor'].forEach(tool => {
            cy.get(`a[href="${MODULE_BASE}/tools/${tool}.jsp"]`).should('contain', `Jahia Super Tools : ${tool}`);
        });
    });
});
