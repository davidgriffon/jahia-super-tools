/*
 * Access control of the module pages.
 *
 * Every JSP of the module requires the tools-access permission, enforced by the Jahia perimeter (Shiro rule on
 * /modules/** JSPs, answering with a redirect to the login page) and again inside each page by the
 * <st:requireToolsAccess/> tag (answering 403). The GraphQL fields of the module check the same permission.
 */
import gql from 'graphql-tag';
import {createUser, deleteUser} from '@jahia/cypress';
import {MODULE_BASE} from '../support/helpers';

const PLAIN_USER = 'st-plain-user';
const PLAIN_PASSWORD = 'st-plain-password-1';

describe('Access control of the Jahia Super Tools pages', () => {
    const pages: string[] = Cypress.env('SUPER_TOOLS_PAGES') as string[];

    before(() => {
        deleteUser(PLAIN_USER);
        createUser(PLAIN_USER, PLAIN_PASSWORD);
    });

    after(() => {
        deleteUser(PLAIN_USER);
    });

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

    it('denies every page to a logged-in user without the tools permission', () => {
        cy.login(PLAIN_USER, PLAIN_PASSWORD);
        pages.forEach(page => {
            cy.request({url: `${MODULE_BASE}/${page}`, failOnStatusCode: false, followRedirect: false}).then(response => {
                expect(response.status, `plain user GET ${page}`).to.not.eq(200);
                expect(response.body, `plain user body ${page}`).to.not.contain('st-app');
            });
        });
        cy.logout();
    });

    it('denies the module GraphQL API to a logged-in user without the tools permission', () => {
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            failOnStatusCode: false,
            auth: {user: PLAIN_USER, pass: PLAIN_PASSWORD},
            headers: {'Content-Type': 'application/json', Origin: Cypress.config('baseUrl')},
            body: {query: '{ admin { superTools { cache { stats { size } } jcr(workspace: "default") { node(path: "/") { path } } } } }'}
        }).then(response => {
            expect(response.body.errors, 'GraphQL errors').to.be.an('array').and.not.to.be.empty;
            expect(response.body.errors[0].message).to.match(/Permission denied/);
            expect(response.body.data?.admin?.superTools?.cache, 'no cache data').to.not.exist;
            expect(response.body.data?.admin?.superTools?.jcr, 'no jcr data').to.not.exist;
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
