import {toXml} from '../shared/export';
import {CACHE_ENTRIES} from './graphql';
import {parseCacheKey} from './cacheKeyParser';

/** Upper bound of one export, in entries: the export reads the cache through pages of 1000. */
export const EXPORT_LIMIT = 20000;
const PAGE_SIZE = 1000;

const COLUMNS = [
    {key: 'key', label: 'Key'},
    {key: 'site', label: 'Site'},
    {key: 'lang', label: 'Language'},
    {key: 'path', label: 'Path'},
    {key: 'template', label: 'Template'},
    {key: 'templateType', label: 'Template type'},
    {key: 'acl', label: 'ACL'},
    {key: 'present', label: 'Present'},
    {key: 'size', label: 'Size (bytes)'},
    {key: 'hitCount', label: 'Hits'},
    {key: 'creation', label: 'Created'},
    {key: 'lastAccess', label: 'Last access'},
    {key: 'expiration', label: 'Expires'},
    {key: 'timeToLive', label: 'Time to live (s)'}
];

function withParts(entry) {
    const parts = {};
    parseCacheKey(entry.key).parts.filter(part => !part.isEmpty).forEach(part => {
        parts[part.shortName] = part.value;
    });
    return {...entry, parts};
}

/** Reads every entry matching the filters of the screen, page after page, up to EXPORT_LIMIT. */
async function fetchAll(client, filters) {
    const entries = [];
    let stats = null;
    let total = 0;
    for (let page = 1; entries.length < EXPORT_LIMIT; page++) {
        // eslint-disable-next-line no-await-in-loop
        const result = await client.query({query: CACHE_ENTRIES, fetchPolicy: 'network-only', variables: {...filters, page, pageSize: PAGE_SIZE}});
        const cache = result.data.admin.superTools.cache;
        stats = cache.stats;
        total = cache.entries.pagination.totalEntries;
        entries.push(...cache.entries.entries);
        if (!cache.entries.pagination.hasNextPage) {
            break;
        }
    }
    return {stats, total, entries: entries.slice(0, EXPORT_LIMIT)};
}

export async function cacheExportSpec(client, filters) {
    const {stats, total, entries} = await fetchAll(client, filters);
    const document = {
        exportedAt: new Date().toISOString(),
        filter: {groupBy: filters.groupBy || null, filterValue: filters.filterValue || null, search: filters.search || null},
        stats,
        totalEntries: total,
        exportedEntries: entries.length,
        truncated: entries.length < total,
        entries: entries.map(withParts)
    };
    const suffix = [filters.groupBy && `${filters.groupBy}-${filters.filterValue}`, filters.search && `search-${filters.search}`].filter(Boolean).join('_') || 'all';
    return {
        tool: 'output-cache',
        suffix,
        json: () => document,
        csv: () => ({columns: COLUMNS, rows: document.entries.map(entry => ({...entry, ...entry.parts}))}),
        xml: () => toXml('outputCache', document, {entries: 'entry'})
    };
}
