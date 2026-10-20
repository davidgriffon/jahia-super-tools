import gql from 'graphql-tag';

export const MODULE_BASE = '/modules/jahia-super-tools';

export const PAGES = {
    index: `${MODULE_BASE}/index.jsp`,
    jcrBrowser: `${MODULE_BASE}/tools/jcrBrowser.jsp`,
    cacheBrowser: `${MODULE_BASE}/tools/cacheBrowser.jsp`,
    permissionTester: `${MODULE_BASE}/tools/permissionTester.jsp`,
    assetsUsage: `${MODULE_BASE}/tools/assetsUsage.jsp`,
    springBeanEditor: `${MODULE_BASE}/tools/springBeanEditor.jsp`,
    springBeanEditorApi: `${MODULE_BASE}/tools/api/springBeanEditor.jsp`
};

/** A page rendered for anonymous visitors on every Jahia: visiting it fills the HTML output cache. */
export const CACHE_SEED_URL = '/cms/render/live/en/sites/systemsite/home.html';

export const byTestId = (id: string): string => `[data-testid="${id}"]`;

/** Number of entries in the output cache, read through the module's GraphQL API. */
export function cacheSize(): Cypress.Chainable<number> {
    return cy.apollo({
        fetchPolicy: 'no-cache',
        query: gql`{ admin { superTools { cache { stats { size } } } } }`
    }).then(response => response.data.admin.superTools.cache.stats.size as number);
}

/** Deletes a node when it exists; a missing node is not an error (used for cleanup before and after a suite). */
export function deleteNodeIfExists(path: string): void {
    cy.apollo({
        errorPolicy: 'all',
        mutation: gql`mutation($path: String!) { jcr { deleteNode(pathOrId: $path) } }`,
        variables: {path}
    });
}

/** One property of a node in the edit workspace, or null when the node or the property does not exist. */
export function propertyValue(path: string, name: string, language?: string): Cypress.Chainable<string | null> {
    return cy.apollo({
        errorPolicy: 'all',
        fetchPolicy: 'no-cache',
        query: gql`query($path: String!, $name: String!, $language: String) {
            jcr { nodeByPath(path: $path) { property(name: $name, language: $language) { value values } } }
        }`,
        variables: {path, name, language}
    }).then(response => {
        const property = response.data?.jcr?.nodeByPath?.property;
        if (!property) {
            return null;
        }
        return property.value ?? (property.values ? property.values.join(',') : null);
    });
}

/** Opens a MUI select and picks the option with the given label. */
export function pickSelectOption(testId: string, label: string): void {
    cy.get(byTestId(testId)).click();
    cy.get('ul[role="listbox"] li[role="option"]').contains(label).click();
}

/** Types in a MUI autocomplete and picks the option containing the given label. */
export function pickAutocompleteOption(inputTestId: string, text: string, label = text): void {
    cy.get(byTestId(inputTestId)).clear();
    cy.get(byTestId(inputTestId)).type(text);
    cy.get('ul[role="listbox"] li[role="option"]').contains(label).click();
}

/**
 * Records every file the tools hand to the browser (they all go through URL.createObjectURL), on every page loaded
 * during the current test, so that a test can read what an export produced without going through the downloads folder.
 */
export function captureExports(): void {
    cy.on('window:before:load', (win: Cypress.AUTWindow) => {
        const target = win as unknown as {__stExports: Blob[]};
        target.__stExports = [];
        const original = win.URL.createObjectURL.bind(win.URL);
        win.URL.createObjectURL = (blob: Blob) => {
            target.__stExports.push(blob);
            return original(blob);
        };
    });
}

/** Text of the n-th file exported on the current page (0 for the first one). */
export function exportedText(index = 0): Cypress.Chainable<string> {
    return cy.window().its('__stExports').should('have.length.greaterThan', index)
        .then((list: Blob[]) => list[index].text());
}
