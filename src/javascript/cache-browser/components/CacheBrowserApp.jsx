import {useCallback, useEffect, useMemo, useState} from 'react';
import {useApolloClient, useMutation, useQuery} from '@apollo/client';
import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Chip,
    CircularProgress,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import {
    Delete as DeleteIcon,
    DeleteSweep as DeleteSweepIcon,
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import {CACHE_ENTRIES, CACHE_ENTRY, CACHE_GROUP_VALUES, FLUSH_ALL, FLUSH_ENTRY} from '../graphql';
import {CACHE_KEY_PARTS, getPart} from '../cacheKeyParser';
import {formatBytes, formatDate, formatDuration, formatNumber, formatRelativeTime} from '../../shared/format';
import {errorMessage} from '../../shared/apollo';
import ConfirmDialog from '../../shared/ConfirmDialog';
import {useNotification} from '../../shared/useNotification';
import CacheStatistics from './CacheStatistics';
import CacheEntryDetails from './CacheEntryDetails';
import ExportMenu from '../../shared/ExportMenu';
import {cacheExportSpec} from '../export';

const SORTERS = {
    key: (a, b) => a.key.localeCompare(b.key),
    size: (a, b) => (b.size || 0) - (a.size || 0),
    hits: (a, b) => (b.hitCount || 0) - (a.hitCount || 0),
    expiration: (a, b) => (a.timeToLive || 0) - (b.timeToLive || 0),
    lastAccess: (a, b) => new Date(b.lastAccess || 0) - new Date(a.lastAccess || 0),
    site: (a, b) => (getPart(a.key, 'site') || '').localeCompare(getPart(b.key, 'site') || ''),
    path: (a, b) => (getPart(a.key, 'path') || '').localeCompare(getPart(b.key, 'path') || '')
};

function useDebounced(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const handle = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(handle);
    }, [value, delay]);
    return debounced;
}

export default function CacheBrowserApp() {
    const client = useApolloClient();
    const {notify, notification} = useNotification();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [groupBy, setGroupBy] = useState('site');
    const [filterValue, setFilterValue] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('key');
    const [showContent, setShowContent] = useState(false);
    const [contentCache, setContentCache] = useState({});
    const [selectedKey, setSelectedKey] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const debouncedSearch = useDebounced(search, 400);

    const groupValuesQuery = useQuery(CACHE_GROUP_VALUES, {variables: {groupBy}, skip: groupBy === 'none'});
    const groupValues = useMemo(() => groupValuesQuery.data?.admin?.superTools?.cache?.groupValues || [], [groupValuesQuery.data]);

    // When the grouping changes, select the first available value so the list is never empty by accident.
    useEffect(() => {
        if (groupBy === 'none') {
            setFilterValue('');
        } else if (groupValues.length > 0 && !groupValues.includes(filterValue)) {
            setFilterValue(groupValues[0]);
        }
    }, [groupBy, groupValues, filterValue]);

    useEffect(() => setPage(1), [groupBy, filterValue, debouncedSearch, pageSize]);

    const entriesQuery = useQuery(CACHE_ENTRIES, {
        variables: {
            page,
            pageSize,
            groupBy: groupBy === 'none' ? null : groupBy,
            filterValue: groupBy === 'none' ? null : filterValue,
            search: debouncedSearch || null
        },
        skip: groupBy !== 'none' && !filterValue && groupValues.length > 0
    });
    const cacheData = entriesQuery.data?.admin?.superTools?.cache;
    const pagination = cacheData?.entries?.pagination;

    const refreshAll = useCallback(() => {
        setContentCache({});
        groupValuesQuery.refetch();
        return entriesQuery.refetch();
    }, [entriesQuery, groupValuesQuery]);

    const [flushEntry] = useMutation(FLUSH_ENTRY);
    const [flushAll] = useMutation(FLUSH_ALL);

    const doFlushEntry = useCallback(async key => {
        const result = await flushEntry({variables: {key}});
        if (result.errors) {
            notify('error', errorMessage(result.errors));
        } else {
            notify(result.data.admin.superTools.cache.flushEntry ? 'success' : 'info', result.data.admin.superTools.cache.flushEntry ? 'Entry flushed' : 'Entry was already gone');
            setSelectedKey(current => (current === key ? null : current));
            refreshAll();
        }
    }, [flushEntry, notify, refreshAll]);

    const doFlushAll = useCallback(async () => {
        const result = await flushAll();
        if (result.errors) {
            notify('error', errorMessage(result.errors));
        } else {
            notify('success', 'Output cache and dependencies cache flushed');
            setSelectedKey(null);
            refreshAll();
        }
    }, [flushAll, notify, refreshAll]);

    const entries = useMemo(() => {
        const list = [...(cacheData?.entries?.entries || [])];
        list.sort(SORTERS[sortBy] || SORTERS.key);
        return list;
    }, [cacheData, sortBy]);

    // Content preview column: fetch lazily, once per key.
    useEffect(() => {
        if (!showContent) {
            return;
        }
        entries.filter(entry => contentCache[entry.key] === undefined).forEach(entry => {
            setContentCache(prev => ({...prev, [entry.key]: null}));
            client.query({query: CACHE_ENTRY, variables: {key: entry.key}})
                .then(result => {
                    const detail = result.data?.admin?.superTools?.cache?.entry;
                    setContentCache(prev => ({...prev, [entry.key]: detail ? (detail.content || '') : '(entry no longer cached)'}));
                })
                .catch(error => setContentCache(prev => ({...prev, [entry.key]: `Error: ${errorMessage(error)}`})));
        });
    }, [showContent, entries, contentCache, client]);

    const groupLabel = CACHE_KEY_PARTS.find(part => part.shortName === groupBy)?.name;

    return (
        <Box>
            {cacheData?.stats && <CacheStatistics stats={cacheData.stats}/>}

            <Stack spacing={1.5} sx={{mb: 2}}>
                <Stack direction={{xs: 'column', md: 'row'}} spacing={1.5} alignItems="center">
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search in cache keys (server side)..."
                        value={search}
                        slotProps={{htmlInput: {'data-testid': 'cache-search'}, input: {startAdornment: <InputAdornment position="start"><SearchIcon/></InputAdornment>}}}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <ButtonGroup variant="outlined" size="small">
                        <Button startIcon={<RefreshIcon/>} data-testid="cache-refresh" onClick={refreshAll}>Refresh</Button>
                        <Button
                            color="error"
                            startIcon={<DeleteSweepIcon/>}
                            data-testid="cache-flush-all"
                            onClick={() => setConfirm({
                                title: 'Flush all cache entries',
                                message: 'This empties the HTML output cache and its dependencies cache on this node. Continue?',
                                confirmLabel: 'Flush all',
                                action: doFlushAll
                            })}
                        >
                            Flush all
                        </Button>
                    </ButtonGroup>
                    <ExportMenu
                        formats={['csv', 'json', 'xml']}
                        testId="cache-export"
                        descriptions={{csv: 'one line per entry, key parts in columns', json: 'statistics, filter and entries', xml: 'statistics, filter and entries'}}
                        disabled={!cacheData}
                        spec={() => cacheExportSpec(client, {
                            groupBy: groupBy === 'none' ? null : groupBy,
                            filterValue: groupBy === 'none' ? null : filterValue,
                            search: debouncedSearch || null
                        })}
                        onExported={fileName => notify('success', `Exported ${fileName}`)}
                        onError={error => notify('error', `Export failed: ${error.message}`)}
                    />
                    <ButtonGroup variant="outlined" size="small">
                        <Button variant={showContent ? 'outlined' : 'contained'} onClick={() => setShowContent(false)}>List</Button>
                        <Button variant={showContent ? 'contained' : 'outlined'} data-testid="cache-content-preview" onClick={() => setShowContent(true)}>Content preview</Button>
                    </ButtonGroup>
                </Stack>
                <Stack direction={{xs: 'column', md: 'row'}} spacing={1.5} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <FormControl size="small" sx={{minWidth: 180}}>
                            <InputLabel>Group by</InputLabel>
                            <Select value={groupBy} label="Group by" data-testid="cache-group-by" onChange={e => setGroupBy(e.target.value)}>
                                <MenuItem value="none">No grouping</MenuItem>
                                {CACHE_KEY_PARTS.map(part => <MenuItem key={part.shortName} value={part.shortName}>{part.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {groupBy !== 'none' && (
                            <FormControl size="small" sx={{minWidth: 260}}>
                                <InputLabel>{groupLabel}</InputLabel>
                                <Select
                                    value={groupValues.includes(filterValue) ? filterValue : ''}
                                    label={groupLabel}
                                    data-testid="cache-filter-value"
                                    disabled={groupValuesQuery.loading}
                                    onChange={e => setFilterValue(e.target.value)}
                                >
                                    {groupValues.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                                </Select>
                            </FormControl>
                        )}
                        {groupBy !== 'none' && !groupValuesQuery.loading && groupValues.length === 0 && (
                            <Typography variant="body2" color="text.secondary">No value for this key part</Typography>
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <FormControl size="small" sx={{minWidth: 180}}>
                            <InputLabel>Sort by</InputLabel>
                            <Select value={sortBy} label="Sort by" onChange={e => setSortBy(e.target.value)}>
                                <MenuItem value="key">Key</MenuItem>
                                <MenuItem value="size">Size (largest first)</MenuItem>
                                <MenuItem value="hits">Hits (most first)</MenuItem>
                                <MenuItem value="expiration">Expires soon first</MenuItem>
                                <MenuItem value="lastAccess">Recently accessed</MenuItem>
                                <MenuItem value="site">Site</MenuItem>
                                <MenuItem value="path">Path</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{minWidth: 130}}>
                            <InputLabel>Per page</InputLabel>
                            <Select value={pageSize} label="Per page" onChange={e => setPageSize(Number(e.target.value))}>
                                {[10, 25, 50, 100, 200, 500].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                </Stack>
            </Stack>

            {entriesQuery.error && <Alert severity="error" sx={{mb: 2}}>{errorMessage(entriesQuery.error)}</Alert>}
            {entriesQuery.loading && !cacheData && (
                <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}><CircularProgress/></Box>
            )}

            {cacheData && (
                <>
                    <Paper sx={{p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1}} data-testid="cache-group-header">
                        <Typography variant="h6" sx={{flexGrow: 1}}>
                            {groupBy === 'none' ? 'All entries' : `${groupLabel} = ${filterValue}`}
                        </Typography>
                        {entriesQuery.loading && <CircularProgress size={16}/>}
                        <Chip label={`${formatNumber(pagination?.totalEntries || 0)} entries`} size="small" data-testid="cache-total"/>
                    </Paper>
                    <TableContainer component={Paper}>
                        <Table size="small" data-testid="cache-table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Cache key</TableCell>
                                    {showContent ? <TableCell sx={{width: '55%'}}>Content preview</TableCell> : (
                                        <>
                                            <TableCell>Size</TableCell>
                                            <TableCell>Hits</TableCell>
                                            <TableCell>Expires</TableCell>
                                            <TableCell>Last access</TableCell>
                                        </>
                                    )}
                                    <TableCell sx={{width: 170}}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.map(entry => (
                                    <TableRow key={entry.key} hover sx={{opacity: entry.present ? 1 : 0.5}} data-testid="cache-entry-row">
                                        <TableCell>
                                            <Typography variant="body2" sx={{fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem'}}>
                                                {entry.key}
                                            </Typography>
                                        </TableCell>
                                        {showContent ? (
                                            <TableCell>
                                                {contentCache[entry.key] === null || contentCache[entry.key] === undefined ? <CircularProgress size={16}/> : (
                                                    <Box component="pre" sx={{m: 0, p: 1, bgcolor: 'grey.100', borderRadius: 1, maxHeight: 160, overflow: 'auto', fontSize: '0.7rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                                                        {contentCache[entry.key].substring(0, 800) || '(empty)'}
                                                    </Box>
                                                )}
                                            </TableCell>
                                        ) : (
                                            <>
                                                <TableCell><Chip label={formatBytes(entry.size)} size="small" color="info" variant="outlined"/></TableCell>
                                                <TableCell><Chip label={formatNumber(entry.hitCount)} size="small" color="success" variant="outlined"/></TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        color={entry.timeToLive <= 0 ? 'error' : entry.timeToLive < 60000 ? 'warning.main' : 'text.secondary'}
                                                        sx={{whiteSpace: 'nowrap'}}
                                                    >
                                                        {entry.expiration ? <>{formatDate(entry.expiration)}<br/>({formatDuration(entry.timeToLive)})</> : 'N/A'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title={formatDate(entry.lastAccess)}>
                                                        <Typography variant="body2" color="text.secondary" sx={{whiteSpace: 'nowrap'}}>{formatRelativeTime(entry.lastAccess)}</Typography>
                                                    </Tooltip>
                                                </TableCell>
                                            </>
                                        )}
                                        <TableCell>
                                            <Stack direction="row" spacing={0.5}>
                                                <Button size="small" variant="outlined" startIcon={<VisibilityIcon/>} data-testid="cache-entry-view" onClick={() => setSelectedKey(entry.key)}>View</Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<DeleteIcon/>}
                                                    data-testid="cache-entry-flush"
                                                    onClick={() => setConfirm({
                                                        title: 'Flush cache entry',
                                                        message: `Remove this entry from the output cache?\n\n${entry.key}`,
                                                        confirmLabel: 'Flush',
                                                        action: () => doFlushEntry(entry.key)
                                                    })}
                                                >
                                                    Flush
                                                </Button>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {entries.length === 0 && !entriesQuery.loading && (
                        <Alert severity="info" sx={{mt: 2}} data-testid="cache-empty">No cache entry matches the current filters.</Alert>
                    )}
                    {pagination && pagination.totalPages > 1 && (
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{mt: 2}}>
                            <Pagination showFirstButton showLastButton count={pagination.totalPages} page={page} color="primary" onChange={(e, value) => setPage(value)}/>
                            <Typography variant="body2" color="text.secondary">
                                {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, pagination.totalEntries)} of {formatNumber(pagination.totalEntries)}
                            </Typography>
                        </Stack>
                    )}
                </>
            )}

            {selectedKey && (
                <CacheEntryDetails
                    cacheKey={selectedKey}
                    onClose={() => setSelectedKey(null)}
                    onCopied={() => notify('success', 'Cache key copied to clipboard')}
                    onFlush={key => setConfirm({
                        title: 'Flush cache entry',
                        message: `Remove this entry from the output cache?\n\n${key}`,
                        confirmLabel: 'Flush',
                        action: () => doFlushEntry(key)
                    })}
                />
            )}
            <ConfirmDialog
                open={Boolean(confirm)}
                title={confirm?.title || ''}
                message={confirm?.message || ''}
                confirmLabel={confirm?.confirmLabel}
                color="error"
                onCancel={() => setConfirm(null)}
                onConfirm={() => {
                    const action = confirm?.action;
                    setConfirm(null);
                    if (action) {
                        action();
                    }
                }}
            />
            {notification}
        </Box>
    );
}
