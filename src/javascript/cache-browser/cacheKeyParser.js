/**
 * Jahia module cache keys are the values produced by the CacheKeyPartGenerators, joined with "@@", in this order.
 * The short names match the `groupBy` argument of the GraphQL API.
 */
export const CACHE_KEY_PARTS = [
    {name: 'Language', shortName: 'lang'},
    {name: 'Path', shortName: 'path'},
    {name: 'Canonical path', shortName: 'canonical'},
    {name: 'Template', shortName: 'template'},
    {name: 'Template type', shortName: 'templateType'},
    {name: 'ACL', shortName: 'acl'},
    {name: 'Context', shortName: 'context'},
    {name: 'Wrapped', shortName: 'wrapped'},
    {name: 'Custom', shortName: 'custom'},
    {name: 'Query string', shortName: 'queryString'},
    {name: 'Template nodes', shortName: 'templateNodes'},
    {name: 'Resource ID', shortName: 'resourceId'},
    {name: 'In area', shortName: 'inArea'},
    {name: 'Site', shortName: 'site'},
    {name: 'Module params', shortName: 'moduleParams'},
    {name: 'Ajax', shortName: 'ajax'},
    {name: 'Area resource', shortName: 'areaResource'},
    {name: 'Read only', shortName: 'readOnly'},
    {name: 'External reference', shortName: 'externalRef'}
];

export function parseCacheKey(cacheKey) {
    if (!cacheKey || typeof cacheKey !== 'string') {
        return {raw: cacheKey, parts: []};
    }
    const values = cacheKey.split('@@');
    const parts = [];
    for (let i = 0; i < Math.max(values.length, CACHE_KEY_PARTS.length); i++) {
        const value = values[i] || '';
        const definition = CACHE_KEY_PARTS[i];
        parts.push({
            name: definition ? definition.name : `Unknown part ${i}`,
            shortName: definition ? definition.shortName : `unknown_${i}`,
            value,
            isEmpty: value === '' || value === '{}',
            index: i
        });
    }
    return {raw: cacheKey, parts};
}

export function getPart(cacheKey, shortName) {
    const part = parseCacheKey(cacheKey).parts.find(p => p.shortName === shortName);
    return part && part.value ? part.value : null;
}

/** Decodes HTML-escaped JSON values ({&quot;editableModule&quot;:false}) found in some key parts. */
export function parseKeyValue(value) {
    if (!value || typeof value !== 'string') {
        return value;
    }
    const unescaped = value.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (unescaped.startsWith('{') || unescaped.startsWith('[')) {
        try {
            return JSON.parse(unescaped);
        } catch {
            return value;
        }
    }
    return value;
}
