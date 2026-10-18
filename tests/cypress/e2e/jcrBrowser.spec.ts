/*
 * JCR Explorer (tools/jcrBrowser.jsp): React page on the module's raw JCR API (admin.superTools.jcr), which mirrors
 * javax.jcr on the session of the default provider. The suite works on its own content folder under the system site,
 * created before and deleted after the run.
 */
import gql from 'graphql-tag';
import {addNode} from '@jahia/cypress';
import {PAGES, byTestId, deleteNodeIfExists, propertyValue} from '../support/helpers';

const FOLDER = 'st-cypress-jcr';
const FOLDER_PATH = `/sites/systemsite/contents/${FOLDER}`;
const TEXT_PATH = `${FOLDER_PATH}/intro`;
const TRANSLATION_PATH = `${TEXT_PATH}/j:translation_en`;

const urlOf = (path: string, workspace = 'default') => `${PAGES.jcrBrowser}#workspace=${workspace}&path=${path}`;

const propertyRow = (name: string) => cy.get(`${byTestId('jcr-property-row')}[data-property="${name}"]`);

/** Reads one node through the raw API, as the browser does. */
const rawNode = (path: string, workspace = 'default') => cy.apollo({
    errorPolicy: 'all',
    fetchPolicy: 'no-cache',
    query: gql`query($path: String!, $workspace: String!) {
        admin { superTools { jcr(workspace: $workspace) { node(path: $path) { uuid name path primaryType mixins locked childrenCount
            children(limit: 50) { totalCount nodes { name primaryType } }
            properties { name type multiple value values protected } } } } }
    }`,
    variables: {path, workspace}
}).then(response => response.data?.admin?.superTools?.jcr?.node ?? null);

describe('JCR Explorer', () => {
    before(() => {
        cy.login();
        deleteNodeIfExists(FOLDER_PATH);
        addNode({parentPathOrId: '/sites/systemsite/contents', name: FOLDER, primaryNodeType: 'jnt:contentFolder'});
        addNode({
            parentPathOrId: FOLDER_PATH,
            name: 'intro',
            primaryNodeType: 'jnt:text',
            properties: [{name: 'text', value: 'Hello from Cypress', language: 'en'}]
        });
        cy.logout();
    });

    after(() => {
        cy.login();
        deleteNodeIfExists(FOLDER_PATH);
        cy.logout();
    });

    beforeEach(() => cy.login());
    afterEach(() => cy.logout());

    describe('raw JCR API', () => {
        it('exposes the repository as javax.jcr sees it: translation nodes and protected properties', () => {
            rawNode(TEXT_PATH).then(node => {
                expect(node.primaryType).to.eq('jnt:text');
                expect(node.children.nodes.map((child: {name: string}) => child.name)).to.include('j:translation_en');
                const primaryType = node.properties.find((property: {name: string}) => property.name === 'jcr:primaryType');
                expect(primaryType).to.include({type: 'NAME', protected: true, value: 'jnt:text'});
                expect(node.properties.some((property: {name: string}) => property.name === 'text'), 'i18n value lives in the translation node').to.eq(false);
            });
            // Mocha runs this nested suite after the sibling tests, one of which edits the value: compare with Jahia's view.
            propertyValue(TEXT_PATH, 'text', 'en').then(expected => {
                rawNode(TRANSLATION_PATH).then(node => {
                    expect(node.primaryType).to.eq('jnt:translation');
                    expect(node.properties.find((property: {name: string}) => property.name === 'text').value).to.eq(expected);
                });
            });
        });

        it('rejects an unknown workspace and reports a missing path', () => {
            cy.apollo({errorPolicy: 'all', fetchPolicy: 'no-cache', query: gql`{ admin { superTools { jcr(workspace: "nope") { workspace } } } }`}).then(response => {
                expect(response.errors[0].message).to.contain('Unknown workspace');
            });
            cy.apollo({errorPolicy: 'all', fetchPolicy: 'no-cache', query: gql`{ admin { superTools { jcr { node(path: "/no/such/node/for/cypress") { path } } } } }`}).then(response => {
                expect(response.errors[0].message).to.contain('PathNotFoundException');
            });
        });
    });

    it('shows the details of a node addressed by path', () => {
        cy.visit(urlOf(FOLDER_PATH));
        cy.get(byTestId('jcr-node-name')).should('contain', FOLDER);
        cy.get(byTestId('jcr-node-path')).should('contain', FOLDER_PATH);
        cy.get(byTestId('jcr-node-uuid')).invoke('text').should('match', /^[0-9a-f-]{36}$/);
        cy.get(byTestId('jcr-node-type')).should('contain', 'jnt:contentFolder');
        cy.get(byTestId('jcr-node-definition')).should('contain', 'jnt:contentFolder');
        cy.get(byTestId('jcr-breadcrumb')).should('contain', 'systemsite').and('contain', 'contents');
        cy.get(byTestId('jcr-path-input')).should('have.value', FOLDER_PATH);
        // Raw JCR: protected properties are listed, read only.
        propertyRow('jcr:primaryType').should('contain', 'NAME').and('contain', 'jnt:contentFolder');
        propertyRow('jcr:primaryType').find(byTestId('jcr-property-protected')).should('exist');
        propertyRow('jcr:primaryType').find(byTestId('jcr-property-edit')).should('be.disabled');
        propertyRow('jcr:createdBy').find(byTestId('jcr-property-value')).should('contain', 'root');
        propertyRow('jcr:created').should('contain', 'DATE').and('contain', 'mix:created');
    });

    it('expands the tree to the node and lists its raw children', () => {
        cy.visit(urlOf(TEXT_PATH));
        cy.get(byTestId('jcr-tree')).should('contain', 'systemsite').and('contain', FOLDER).and('contain', 'intro').and('contain', 'j:translation_en');
    });

    it('navigates with the path input and the tree', () => {
        cy.visit(PAGES.jcrBrowser);
        cy.get(byTestId('jcr-node-type')).should('contain', 'rep:root');
        cy.get(byTestId('jcr-path-input')).clear();
        cy.get(byTestId('jcr-path-input')).type(`${FOLDER_PATH}{enter}`);
        cy.get(byTestId('jcr-node-path')).should('contain', FOLDER_PATH);
        cy.location('hash').should('contain', `path=${encodeURIComponent(FOLDER_PATH)}`);

        cy.get(byTestId('jcr-tree')).contains('[role="treeitem"]', 'intro').click();
        cy.get(byTestId('jcr-node-name')).should('contain', 'intro');
        cy.get(byTestId('jcr-node-type')).should('contain', 'jnt:text');
        cy.location('hash').should('contain', 'uuid=');
    });

    it('marks the session kind with a badge and a colour', () => {
        cy.visit(urlOf(FOLDER_PATH));
        cy.get(byTestId('jcr-session-bar')).should('have.attr', 'data-session-mode', 'RAW');
        cy.get(byTestId('jcr-session-badge')).should('contain', 'Pure JCR session').and('have.css', 'background-color', 'rgb(84, 110, 122)');
        cy.get(byTestId('jcr-node-session')).should('contain', 'Pure JCR');
        cy.get(byTestId('jcr-session-JAHIA')).click();
        cy.get(byTestId('jcr-session-bar')).should('have.attr', 'data-session-mode', 'JAHIA');
        cy.get(byTestId('jcr-session-badge')).should('contain', 'Jahia JCR session').and('have.css', 'background-color', 'rgb(0, 137, 123)');
        cy.get(byTestId('jcr-node-session')).should('contain', 'Jahia JCR');
        cy.get(byTestId('jcr-jahia-info')).should('be.visible');
    });

    it('copies a property name and a value to the clipboard', () => {
        cy.visit(urlOf(FOLDER_PATH), {
            onBeforeLoad(win) {
                cy.stub(win.navigator.clipboard, 'writeText').as('writeText').resolves();
            }
        });
        propertyRow('jcr:primaryType').find(byTestId('jcr-property-copy-name')).click();
        cy.get('@writeText').should('have.been.calledWith', 'jcr:primaryType');
        cy.get(byTestId('notification')).should('contain', 'Copied to clipboard');
        propertyRow('jcr:primaryType').find(byTestId('jcr-property-copy-value')).click();
        cy.get('@writeText').should('have.been.calledWith', 'jnt:contentFolder');
    });

    it('filters the properties', () => {
        cy.visit(urlOf(TEXT_PATH));
        cy.get(byTestId('jcr-property-row')).should('have.length.greaterThan', 3);
        cy.get(byTestId('jcr-properties-filter')).type('nodename');
        cy.get(byTestId('jcr-property-row')).should('have.length', 1).and('contain', 'j:nodename');
    });

    it('edits a property of a translation node', () => {
        cy.visit(urlOf(TRANSLATION_PATH));
        cy.get(byTestId('jcr-node-type')).should('contain', 'jnt:translation');
        propertyRow('text').find(byTestId('jcr-property-value')).should('contain', 'Hello from Cypress');
        propertyRow('text').find(byTestId('jcr-property-edit')).click();
        cy.get(byTestId('jcr-property-dialog')).should('contain', 'Edit property');
        cy.get(byTestId('jcr-property-value-input')).clear();
        cy.get(byTestId('jcr-property-value-input')).type('Updated by Cypress');
        cy.get(byTestId('jcr-property-save')).click();
        cy.get(byTestId('notification')).should('contain', 'Property text saved');
        propertyRow('text').find(byTestId('jcr-property-value')).should('contain', 'Updated by Cypress');
        propertyValue(TEXT_PATH, 'text', 'en').should('eq', 'Updated by Cypress');
    });

    it('adds a mixin, adds and removes a property, removes the mixin', () => {
        cy.visit(urlOf(FOLDER_PATH));
        cy.get(byTestId('jcr-action-add-mixin')).click();
        cy.get(byTestId('jcr-mixin-input')).type('jmix:keywords');
        cy.get('ul[role="listbox"] li[role="option"]').contains(/^jmix:keywords$/).click();
        cy.get(byTestId('jcr-mixin-submit')).click();
        cy.get(byTestId('notification')).should('contain', 'Mixin jmix:keywords added');
        cy.get(byTestId('jcr-node-mixins')).should('contain', 'jmix:keywords');

        cy.get(byTestId('jcr-action-add-property')).click();
        cy.get(byTestId('jcr-property-dialog')).should('contain', 'Add property');
        cy.get(byTestId('jcr-property-name')).type('j:keywords');
        cy.contains('label', 'Multiple').find('input').check();
        cy.get(byTestId('jcr-property-value-input')).type('alpha{enter}beta');
        cy.get(byTestId('jcr-property-save')).click();
        cy.get(byTestId('notification')).should('contain', 'Property j:keywords saved');
        propertyRow('j:keywords').should('contain', 'alpha').and('contain', 'beta');
        propertyValue(FOLDER_PATH, 'j:keywords').should('eq', 'alpha,beta');

        propertyRow('j:keywords').find(byTestId('jcr-property-remove')).click();
        cy.get(byTestId('confirm-dialog')).should('contain', 'Remove property');
        cy.get(byTestId('confirm-dialog-confirm')).click();
        cy.get(byTestId('notification')).should('contain', 'Property j:keywords removed');
        propertyRow('j:keywords').should('not.exist');

        cy.get(byTestId('jcr-node-mixins')).contains('.MuiChip-root', 'jmix:keywords').find('svg').click();
        cy.get(byTestId('confirm-dialog')).should('contain', 'Remove mixin');
        cy.get(byTestId('confirm-dialog-confirm')).click();
        cy.get(byTestId('notification')).should('contain', 'Mixin jmix:keywords removed');
        cy.get(byTestId('jcr-node-header')).should('not.contain', 'jmix:keywords');
    });

    it('adds a child node with a chosen primary type', () => {
        cy.visit(urlOf(FOLDER_PATH));
        cy.get(byTestId('jcr-action-add-node')).click();
        cy.get(byTestId('jcr-add-node-name')).type('raw-child');
        cy.get(byTestId('jcr-add-node-input')).type('jnt:contentFolder');
        cy.get('ul[role="listbox"] li[role="option"]').contains(/^jnt:contentFolder$/).click();
        cy.get(byTestId('jcr-add-node-submit')).click();
        cy.get(byTestId('notification')).should('contain', 'Node raw-child added');
        cy.get(byTestId('jcr-node-path')).should('contain', `${FOLDER_PATH}/raw-child`);
        cy.get(byTestId('jcr-node-type')).should('contain', 'jnt:contentFolder');
        rawNode(`${FOLDER_PATH}/raw-child`).its('primaryType').should('eq', 'jnt:contentFolder');
    });

    it('locks and unlocks the node through the LockManager', () => {
        cy.visit(urlOf(FOLDER_PATH));
        cy.get(byTestId('jcr-action-lock')).click();
        cy.get(byTestId('jcr-lock-submit')).click();
        cy.get(byTestId('notification')).should('contain', 'Node locked');
        cy.get(byTestId('jcr-node-lock')).should('contain', 'Locked by');
        cy.get(byTestId('jcr-action-rename')).should('be.disabled');
        rawNode(FOLDER_PATH).its('locked').should('eq', true);
        cy.get(byTestId('jcr-action-unlock')).click();
        cy.get(byTestId('notification')).should('contain', 'Node unlocked');
        cy.get(byTestId('jcr-node-lock')).should('not.exist');
        cy.get(byTestId('jcr-action-rename')).should('be.enabled');
        rawNode(FOLDER_PATH).its('locked').should('eq', false);
    });

    it('renames the node and back', () => {
        cy.visit(urlOf(TEXT_PATH));
        cy.get(byTestId('jcr-action-rename')).click();
        cy.get(byTestId('jcr-rename-input')).clear();
        cy.get(byTestId('jcr-rename-input')).type('intro-renamed');
        cy.get(byTestId('jcr-rename-submit')).click();
        cy.get(byTestId('notification')).should('contain', 'renamed to intro-renamed');
        cy.get(byTestId('jcr-node-path')).should('contain', `${FOLDER_PATH}/intro-renamed`);

        cy.get(byTestId('jcr-action-rename')).click();
        cy.get(byTestId('jcr-rename-input')).clear();
        cy.get(byTestId('jcr-rename-input')).type('intro');
        cy.get(byTestId('jcr-rename-submit')).click();
        cy.get(byTestId('jcr-node-path')).should('contain', TEXT_PATH);
    });

    it('moves a node to another parent', () => {
        addNode({parentPathOrId: FOLDER_PATH, name: 'to-move', primaryNodeType: 'jnt:contentFolder'});
        addNode({parentPathOrId: FOLDER_PATH, name: 'target', primaryNodeType: 'jnt:contentFolder'});
        cy.visit(urlOf(`${FOLDER_PATH}/to-move`));
        cy.get(byTestId('jcr-action-move')).click();
        cy.get(byTestId('jcr-move-input')).clear();
        cy.get(byTestId('jcr-move-input')).type(`${FOLDER_PATH}/target/moved`);
        cy.get(byTestId('jcr-move-submit')).click();
        cy.get(byTestId('notification')).should('contain', 'moved to');
        cy.get(byTestId('jcr-node-path')).should('contain', `${FOLDER_PATH}/target/moved`);
        rawNode(`${FOLDER_PATH}/to-move`).should('eq', null);
    });

    it('removes a node and moves to its parent', () => {
        addNode({parentPathOrId: FOLDER_PATH, name: 'to-delete', primaryNodeType: 'jnt:contentFolder'});
        cy.visit(urlOf(`${FOLDER_PATH}/to-delete`));
        cy.get(byTestId('jcr-node-name')).should('contain', 'to-delete');
        cy.get(byTestId('jcr-action-delete')).click();
        cy.get(byTestId('confirm-dialog')).should('contain', 'Remove node');
        cy.get(byTestId('confirm-dialog-confirm')).click();
        cy.get(byTestId('notification')).should('contain', 'Node removed');
        cy.get(byTestId('jcr-node-path')).should('contain', FOLDER_PATH).and('not.contain', 'to-delete');
        rawNode(`${FOLDER_PATH}/to-delete`).should('eq', null);
    });

    describe('Jahia session', () => {
        const jahiaUrl = (path: string, extra = '') => `${PAGES.jcrBrowser}#workspace=default&mode=JAHIA&language=en${extra}&path=${path}`;

        it('resolves internationalized properties and hides translation nodes', () => {
            cy.visit(jahiaUrl(TEXT_PATH));
            cy.get(byTestId('jcr-session-info')).should('contain', 'user root');
            cy.get(byTestId('jcr-session-locale')).should('contain', 'locale en');
            cy.get(byTestId('jcr-jahia-info')).should('be.visible');
            cy.get(byTestId('jcr-jahia-displayable-name')).should('not.be.empty');
            cy.get(byTestId('jcr-jahia-locale-en')).should('be.visible');
            cy.get(byTestId('jcr-jahia-valid')).should('contain', 'valid in en');
            propertyRow('text').find(byTestId('jcr-property-i18n')).should('contain', 'i18n en');
            cy.get(byTestId('jcr-tree')).should('contain', 'intro').and('not.contain', 'j:translation_en');
        });

        it('checks a permission for the session user', () => {
            cy.visit(jahiaUrl(FOLDER_PATH));
            cy.get(byTestId('jcr-jahia-permission')).clear();
            cy.get(byTestId('jcr-jahia-permission')).type('jcr:write');
            cy.get(byTestId('jcr-jahia-permission-check')).click();
            cy.get(byTestId('jcr-jahia-permission-result')).should('contain', 'jcr:write granted');
        });

        it('impersonates a user and sees the repository with that user rights', () => {
            cy.visit(jahiaUrl(FOLDER_PATH, '&user=guest'));
            cy.get(byTestId('jcr-session-info')).should('contain', 'user  guest');
            // Guest cannot read the default workspace of the system site contents: the banner names the exception type and the session.
            cy.get(byTestId('jcr-error')).should('contain', 'PathNotFoundException').and('contain', 'as guest');
            cy.get(byTestId('jcr-session-user-clear')).click();
            cy.location('hash').should('not.contain', 'user=');
            cy.get(byTestId('jcr-node-name')).should('contain', FOLDER);
        });

        it('rejects an unknown user and switches back to the pure JCR session', () => {
            cy.visit(jahiaUrl(TEXT_PATH));
            cy.get(byTestId('jcr-session-user')).type('no-such-user-for-cypress{enter}');
            cy.get(byTestId('jcr-session-error')).should('contain', 'Unknown user');
            cy.get(byTestId('jcr-session-RAW')).click();
            cy.location('hash').should('not.contain', 'mode=').and('not.contain', 'user=');
            cy.get(byTestId('jcr-session-info')).should('contain', 'system session');
            cy.get(byTestId('jcr-jahia-info')).should('not.exist');
            // The raw session lists the translation node again under the selected (expanded) text node.
            cy.get(byTestId('jcr-tree')).should('contain', 'j:translation_en');
        });

        it('writes an internationalized property for the session language', () => {
            cy.visit(jahiaUrl(TEXT_PATH));
            propertyRow('text').find(byTestId('jcr-property-edit')).click();
            cy.get(byTestId('jcr-property-value-input')).clear();
            cy.get(byTestId('jcr-property-value-input')).type('Written through the Jahia session');
            cy.get(byTestId('jcr-property-save')).click();
            cy.get(byTestId('notification')).should('contain', 'Property text saved');
            propertyValue(TEXT_PATH, 'text', 'en').should('eq', 'Written through the Jahia session');
            rawNode(TRANSLATION_PATH).then(node => {
                expect(node.properties.find((property: {name: string}) => property.name === 'text').value).to.eq('Written through the Jahia session');
            });
        });
    });

    it('reports an unpublished node when switching to the live workspace', () => {
        cy.visit(urlOf(FOLDER_PATH));
        cy.get(byTestId('jcr-node-name')).should('contain', FOLDER);
        cy.get(byTestId('jcr-path-bar')).should('have.attr', 'data-workspace', 'default');
        cy.get(byTestId('jcr-workspace-badge')).should('contain', 'default workspace').and('have.css', 'background-color', 'rgb(30, 136, 229)');
        cy.get(byTestId('jcr-node-workspace')).should('contain', 'default');
        cy.get(byTestId('jcr-workspace-live')).click();
        cy.location('hash').should('contain', 'workspace=live');
        cy.get(byTestId('jcr-path-bar')).should('have.attr', 'data-workspace', 'live');
        cy.get(byTestId('jcr-workspace-badge')).should('contain', 'live workspace').and('have.css', 'background-color', 'rgb(46, 125, 50)');
        cy.get(byTestId('jcr-error')).should('contain', 'PathNotFoundException').and('contain', 'workspace live');
        cy.get(byTestId('jcr-workspace-default')).click();
        cy.get(byTestId('jcr-node-name')).should('contain', FOLDER);
    });
});
