/*
 * Spring bean editor (tools/springBeanEditor.jsp) and its JSON API (tools/api/springBeanEditor.jsp).
 *
 * The UI test edits one value of the core settingsBean in memory and puts it back; nothing is persisted.
 */
import {PAGES, byTestId, pickAutocompleteOption} from '../support/helpers';

// A core bean with a plain setter-backed int, harmless to bump and restore. settingsBean itself is denied by the policy.
const BEAN = 'ehCacheProvider';
const PROPERTY = 'groupsSizeLimit';

const api = (query: string, failOnStatusCode = true) =>
    cy.request({url: `${PAGES.springBeanEditorApi}?${query}`, failOnStatusCode});

const beanValue = () => api(`action=bean&context=core&bean=${BEAN}`)
    .then(response => response.body.bean.properties.find((property: {name: string}) => property.name === PROPERTY).value as string);

describe('Spring bean editor', () => {
    beforeEach(() => cy.login());
    afterEach(() => cy.logout());

    describe('JSON API', () => {
        it('lists the Spring contexts, the core one first and persistable', () => {
            api('action=contexts').then(response => {
                const contexts = response.body.contexts;
                expect(contexts[0]).to.include({id: 'core', label: 'Jahia core', persistable: true});
                expect(contexts[0].beanCount).to.be.greaterThan(100);
                expect(contexts.some((context: {id: string}) => context.id.startsWith('module:'))).to.eq(true);
            });
        });

        it('lists the instantiated singletons of the core context, minus the denied ones', () => {
            api('action=beans&context=core').then(response => {
                expect(response.body.persistable).to.eq(true);
                expect(response.body.storeFile).to.contain('applicationcontext-override-tools-bean-editor.xml');
                expect(response.body.beans).to.include(BEAN);
                // platform settings, data sources and session factories never appear
                expect(response.body.beans).to.not.include('settingsBean');
                expect(response.body.beans.filter((name: string) => /datasource|sessionfactory/i.test(name))).to.be.empty;
            });
        });

        it('describes a bean with the status of each value', () => {
            api(`action=bean&context=core&bean=${BEAN}`).then(response => {
                const bean = response.body.bean;
                expect(bean.className).to.eq('org.jahia.services.cache.ehcache.EhCacheProvider');
                expect(bean.definitionResource).to.contain('applicationcontext');
                const property = bean.properties.find((candidate: {name: string}) => candidate.name === PROPERTY);
                expect(property).to.include({type: 'int', writable: true, readable: true, persistable: true, sensitive: false});
                expect(['DEFAULT', 'CONFIGURED', 'MEMORY', 'PERSISTED', 'PERSISTED_PENDING']).to.include(property.status);
            });
        });

        it('refuses the denied settingsBean and masks secret-looking properties', () => {
            api('action=bean&context=core&bean=settingsBean', false).then(response => {
                expect(response.status).to.eq(400);
                expect(response.body.error).to.contain('settingsBean');
            });
            api('action=beans&context=core').then(response => {
                const beans: string[] = response.body.beans;
                // whatever bean carries a secret-looking property, its value must come back masked and read only
                const candidates = beans.slice(0, 400);
                cy.wrap(candidates).each((name: string) => {
                    api(`action=bean&context=core&bean=${encodeURIComponent(name)}`, false).then(detail => {
                        if (detail.status !== 200 || !detail.body.bean) {
                            return;
                        }
                        detail.body.bean.properties
                            .filter((property: {sensitive: boolean}) => property.sensitive)
                            .forEach((property: {name: string; value: string; writable: boolean; persistable: boolean}) => {
                                expect(property.value, `${name}.${property.name}`).to.satisfy((value: string) => value === null || value === '********');
                                expect(property.writable, `${name}.${property.name} writable`).to.eq(false);
                                expect(property.persistable, `${name}.${property.name} persistable`).to.eq(false);
                            });
                    });
                });
            });
        });

        it('rejects an unknown context, an unknown bean and a save that is not a POST', () => {
            api(`action=bean&context=no-such-context&bean=${BEAN}`, false).then(response => {
                expect(response.status).to.eq(400);
                expect(response.body.error).to.contain('Unknown context');
            });
            api('action=bean&context=core&bean=noSuchBeanForCypress', false).then(response => {
                expect(response.status).to.eq(400);
                expect(response.body.error).to.contain('noSuchBeanForCypress');
            });
            api(`action=save&context=core&bean=${BEAN}&mode=memory`, false).then(response => {
                expect(response.status).to.eq(405);
            });
        });

        it('refuses a save on a bean of a module context', () => {
            cy.visit(PAGES.springBeanEditor);
            cy.get('#spring-bean-editor-root').invoke('attr', 'data-csrf').then(csrf => {
                api('action=contexts').then(contexts => {
                    const moduleContext = contexts.body.contexts.find((context: {id: string; editable: boolean}) => context.id.startsWith('module:'));
                    expect(moduleContext.editable, 'module context editable flag').to.eq(false);
                    api(`action=beans&context=${encodeURIComponent(moduleContext.id)}`).then(beans => {
                        expect(beans.body.editable, 'module beans editable flag').to.eq(false);
                        cy.request({
                            method: 'POST',
                            url: PAGES.springBeanEditorApi,
                            form: true,
                            failOnStatusCode: false,
                            headers: {Origin: Cypress.config('baseUrl'), 'X-SuperTools-Csrf': csrf as string},
                            body: {action: 'save', context: moduleContext.id, bean: beans.body.beans[0], mode: 'memory'}
                        }).then(response => {
                            expect(response.status).to.eq(403);
                            expect(response.body.error).to.contain('read only');
                        });
                    });
                });
            });
        });

        it('refuses a POST without the module CSRF token or from another origin', () => {
            const post = (headers: Record<string, string>) => cy.request({
                method: 'POST',
                url: PAGES.springBeanEditorApi,
                form: true,
                failOnStatusCode: false,
                headers,
                body: {action: 'save', context: 'core', bean: BEAN, mode: 'memory', [`prop_${PROPERTY}`]: '0'}
            });
            post({}).then(response => {
                expect(response.status).to.eq(403);
                expect(response.body.error).to.contain('Origin');
            });
            post({Origin: Cypress.config('baseUrl')}).then(response => {
                expect(response.status).to.eq(403);
                expect(response.body.error).to.contain('CSRF token');
            });
            post({Origin: 'https://evil.example', 'X-SuperTools-Csrf': 'anything'}).then(response => {
                expect(response.status).to.eq(403);
                expect(response.body.error).to.contain('Cross-origin');
            });
        });
    });

    describe('Editor page', () => {
        it('edits a value in memory after confirmation and puts it back', () => {
            beanValue().then(initial => {
                const edited = String(Number(initial) + 1);
                cy.visit(PAGES.springBeanEditor);
                pickAutocompleteOption('bean-context-input', 'Jahia core');
                cy.contains('Persistence: override file').should('be.visible');
                pickAutocompleteOption('bean-name-input', BEAN);
                cy.get(byTestId('bean-name')).should('contain', BEAN);
                cy.contains('org.jahia.services.cache.ehcache.EhCacheProvider').should('be.visible');
                cy.get(byTestId('bean-property-row')).should('have.length.greaterThan', 2);

                cy.get(byTestId('bean-filter')).type(PROPERTY);
                cy.get(byTestId('bean-property-row')).should('have.length', 1).and('have.attr', 'data-property', PROPERTY);
                cy.get(byTestId('bean-save')).should('be.disabled');
                cy.get(byTestId('bean-value-input')).clear();
                cy.get(byTestId('bean-value-input')).type(edited);
                cy.get(byTestId('bean-save')).should('be.enabled').click();
                // the core context asks for a confirmation before anything is applied
                cy.get(byTestId('confirm-dialog')).should('contain', 'platform settings').and('contain', PROPERTY);
                cy.get(byTestId('confirm-dialog-cancel')).click();
                beanValue().should('eq', initial);
                cy.get(byTestId('bean-save')).click();
                cy.get(byTestId('confirm-dialog-confirm')).click();
                cy.get(byTestId('bean-result')).should('contain', 'Updated in memory').and('contain', PROPERTY);
                cy.get(byTestId('bean-value-input')).should('have.value', edited);
                beanValue().should('eq', edited);

                cy.get(byTestId('bean-value-input')).clear();
                cy.get(byTestId('bean-value-input')).type(initial);
                cy.get(byTestId('bean-save')).click();
                cy.get(byTestId('confirm-dialog-confirm')).click();
                cy.get(byTestId('bean-result')).should('contain', 'Updated in memory');
                beanValue().should('eq', initial);
            });
        });

        it('shows the persisted overrides of the core context', () => {
            cy.visit(PAGES.springBeanEditor);
            cy.get(byTestId('bean-overrides')).should('be.visible').click();
            cy.get(byTestId('bean-overrides')).should('contain', 'Persisted overrides');
            api('action=overrides').then(response => {
                expect(response.body).to.have.property('storeFile');
                expect(response.body.entries).to.be.an('array');
            });
        });

        it('discards pending edits and reloads the bean', () => {
            cy.visit(PAGES.springBeanEditor);
            pickAutocompleteOption('bean-context-input', 'Jahia core');
            pickAutocompleteOption('bean-name-input', BEAN);
            cy.get(byTestId('bean-filter')).type(PROPERTY);
            cy.get(byTestId('bean-value-input')).invoke('val').then(initial => {
                cy.get(byTestId('bean-value-input')).type('99');
                cy.get(byTestId('bean-discard')).should('be.enabled').click();
                cy.get(byTestId('bean-value-input')).should('have.value', initial);
                cy.get(byTestId('bean-save')).should('be.disabled');
                cy.get(byTestId('bean-reload')).click();
                cy.get(byTestId('bean-value-input')).should('have.value', initial);
            });
        });

        it('shows the beans of a module context read only', () => {
            cy.visit(PAGES.springBeanEditor);
            cy.get(byTestId('bean-context-input')).type('module');
            cy.get('ul[role="listbox"] li[role="option"]').first().click();
            cy.get(byTestId('bean-readonly')).should('be.visible').and('contain', 'Read only context');
            cy.get(byTestId('bean-name-input')).click();
            cy.get('ul[role="listbox"] li[role="option"]').first().click();
            cy.get(byTestId('bean-name')).should('be.visible');
            cy.get(byTestId('bean-readonly-chip')).should('contain', 'read only');
            cy.get(byTestId('bean-save')).should('not.exist');
            cy.get(byTestId('bean-value-input')).should('not.exist');
            cy.get(byTestId('bean-value-select')).should('not.exist');
        });
    });
});
