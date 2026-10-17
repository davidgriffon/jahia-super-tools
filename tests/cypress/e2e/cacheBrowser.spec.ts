/*
 * Output cache browser (tools/cacheBrowser.jsp): React page fed by the module GraphQL API.
 *
 * The cache is seeded by rendering the system site home page as an anonymous visitor, a page that exists on every
 * Jahia. Flushing tests run last since they empty what the other tests rely on.
 */
import gql from 'graphql-tag';
import {CACHE_SEED_URL, PAGES, byTestId, cacheSize, pickSelectOption} from '../support/helpers';

const seedCache = () => {
    cy.clearCookies();
    cy.request(CACHE_SEED_URL);
    cy.request(CACHE_SEED_URL);
};

describe('Output cache browser', () => {
    before(() => {
        seedCache();
        cy.login();
        cacheSize().should('be.greaterThan', 0);
        cy.logout();
    });

    beforeEach(() => cy.login());
    afterEach(() => cy.logout());

    it('shows the statistics and the entries grouped by site', () => {
        cy.visit(PAGES.cacheBrowser);
        cy.get(byTestId('cache-stats')).should('be.visible').and('contain', 'Cache hits').and('contain', 'Total entries');
        cy.get(byTestId('cache-group-by')).should('contain', 'Site');
        cy.get(byTestId('cache-filter-value')).should('contain', 'systemsite');
        cy.get(byTestId('cache-group-header')).should('contain', 'Site = systemsite');
        cy.get(byTestId('cache-entry-row')).should('have.length.greaterThan', 0);
        cy.get(byTestId('cache-entry-row')).should($rows => expect($rows.text()).to.contain('/sites/systemsite'));
    });

    it('filters the keys with the search field', () => {
        cy.visit(PAGES.cacheBrowser);
        cy.get(byTestId('cache-entry-row')).should('have.length.greaterThan', 0);
        cy.get(byTestId('cache-search')).type('no-such-key-for-cypress');
        cy.get(byTestId('cache-empty')).should('be.visible');
        cy.get(byTestId('cache-search')).clear();
        cy.get(byTestId('cache-search')).type('systemsite/home');
        cy.get(byTestId('cache-entry-row')).should('have.length.greaterThan', 0).each($row => {
            expect($row.text()).to.contain('systemsite/home');
        });
    });

    it('groups the entries by another key part', () => {
        cy.visit(PAGES.cacheBrowser);
        cy.get(byTestId('cache-entry-row')).should('have.length.greaterThan', 0);
        pickSelectOption('cache-group-by', 'Language');
        cy.get(byTestId('cache-group-header')).should('contain', 'Language = en');
        cy.get(byTestId('cache-entry-row')).should('have.length.greaterThan', 0);
        pickSelectOption('cache-group-by', 'No grouping');
        cy.get(byTestId('cache-group-header')).should('contain', 'All entries');
    });

    it('opens the details of an entry with its parsed key and content', () => {
        cy.visit(PAGES.cacheBrowser);
        cy.get(byTestId('cache-entry-view')).first().click();
        cy.get(byTestId('cache-entry-dialog')).should('be.visible').and('contain', 'Cache entry details');
        cy.get(byTestId('cache-entry-dialog')).contains('td', 'Language').should('be.visible');
        cy.get(byTestId('cache-entry-dialog')).contains('td', 'Path').parent().find('pre').invoke('text').should('match', /^\//);
        cy.get(byTestId('cache-entry-dialog')).contains('button', 'Content').click();
        // the preview is a sandboxed frame (no script, opaque origin), never live HTML in the tools page
        cy.get(byTestId('cache-entry-preview')).should('have.attr', 'sandbox', '').and('have.attr', 'srcdoc');
        cy.get(byTestId('cache-entry-dialog')).contains('Raw HTML').should('be.visible');
        cy.get(byTestId('cache-entry-dialog')).contains('button', 'Raw key').click();
        cy.get(byTestId('cache-entry-dialog')).find('pre').should('contain', '@@');
        cy.get(byTestId('cache-entry-close')).click();
        cy.get(byTestId('cache-entry-dialog')).should('not.exist');
    });

    it('answers the GraphQL API with pagination and group values', () => {
        cy.apollo({
            fetchPolicy: 'no-cache',
            query: gql`{
                admin { superTools { cache {
                    keyParts
                    groupValues(groupBy: "lang")
                    entries(page: 1, pageSize: 2) {
                        pagination { page pageSize totalEntries totalPages hasNextPage hasPreviousPage }
                        entries { key present size hitCount creation expiration timeToLive }
                    }
                } } }
            }`
        }).then(response => {
            const cache = response.data.admin.superTools.cache;
            expect(cache.keyParts).to.have.length(19);
            expect(cache.groupValues).to.include('en');
            expect(cache.entries.pagination.pageSize).to.eq(2);
            expect(cache.entries.pagination.totalEntries).to.be.greaterThan(0);
            expect(cache.entries.entries).to.have.length.of.at.most(2);
            expect(cache.entries.entries[0].key).to.contain('@@');
        });
    });

    it('flushes one entry after confirmation', () => {
        cy.visit(PAGES.cacheBrowser);
        cacheSize().then(sizeBefore => {
            cy.get(byTestId('cache-entry-flush')).first().click();
            cy.get(byTestId('confirm-dialog')).should('contain', 'Flush cache entry');
            cy.get(byTestId('confirm-dialog-confirm')).click();
            cy.get(byTestId('notification')).should('contain', 'Entry flushed');
            cacheSize().should('eq', sizeBefore - 1);
        });
    });

    it('flushes the whole cache after confirmation', () => {
        cy.visit(PAGES.cacheBrowser);
        cy.get(byTestId('cache-flush-all')).click();
        cy.get(byTestId('confirm-dialog')).should('contain', 'Flush all cache entries');
        cy.get(byTestId('confirm-dialog-confirm')).click();
        cy.get(byTestId('notification')).should('contain', 'flushed');
        cacheSize().should('eq', 0);
    });
});
