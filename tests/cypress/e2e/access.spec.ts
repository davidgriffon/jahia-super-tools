/*
 * Access control of the module pages.
 *
 * Every JSP of the module requires the tools-access permission, enforced by the Jahia perimeter (Shiro rule on
 * /modules/** JSPs, answering with a redirect to the login page) and again inside each page by the
 * <st:requireToolsAccess/> tag (answering 403). The GraphQL fields of the module check the same permission.
 */
import gql from 'graphql-tag';
import {MODULE_BASE} from '../support/helpers';

describe('Access control of the Jahia Super Tools pages', () => {
    const pages: string[] = Cypress.env('SUPER_TOOLS_PAGES') as string[];

    it('denies an anonymous request on every page', () => {
        expect(pages, 'SUPER_TOOLS_PAGES configuration').to.be.an('array').and.not.to.be.empty;
        cy.clearCookies();
        pages.forEach(page => {
            cy.request({url: `${MODULE_BASE}/${page}`, failOnStatusCode: false, followRedirect: false}).then(response => {
                expect(response.status, `anonymous GET ${page}`).to.not.eq(200);
            });
        });
    });

    it('denies the module GraphQL API to an anonymous caller', () => {
        cy.clearCookies();
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            failOnStatusCode: false,
            headers: {'Content-Type': 'application/json', Origin: Cypress.config('baseUrl')},
            body: {query: '{ admin { superTools { cache { stats { size } } } } }'}
        }).then(response => {
            expect(response.body.errors, 'GraphQL errors').to.be.an('array').and.not.to.be.empty;
            expect(response.body.data?.admin?.superTools, 'no data for guests').to.not.exist;
        });
    });

    it('serves every page to an administrator', () => {
        cy.login();
        pages.forEach(page => {
            cy.request({url: `${MODULE_BASE}/${page}`, failOnStatusCode: false}).then(response => {
                expect(response.status, `administrator GET ${page}`).to.eq(200);
            });
        });
        cy.logout();
    });

    it('answers the module GraphQL API to an administrator', () => {
        cy.login();
        cy.apollo({query: gql`{ admin { superTools { cache { stats { size } keyParts } } } }`}).then(response => {
            expect(response.data.admin.superTools.cache.stats.size).to.be.a('number');
            expect(response.data.admin.superTools.cache.keyParts).to.include('site');
        });
        cy.logout();
    });
});
