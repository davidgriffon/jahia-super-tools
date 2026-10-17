import {useState} from 'react';
import {useQuery} from '@apollo/client';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    Typography
} from '@mui/material';
import {ContentCopy as CopyIcon, Delete as DeleteIcon} from '@mui/icons-material';
import {CACHE_ENTRY} from '../graphql';
import {parseCacheKey, parseKeyValue} from '../cacheKeyParser';
import {copyToClipboard, formatBytes, formatDate, formatDuration, formatNumber} from '../../shared/format';
import {errorMessage} from '../../shared/apollo';

const mono = {fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem'};

function Meta({label, value}) {
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
            <Typography variant="body2">{value}</Typography>
        </Box>
    );
}

export default function CacheEntryDetails({cacheKey, onClose, onFlush, onCopied}) {
    const [tab, setTab] = useState('parsed');
    const {data, loading, error} = useQuery(CACHE_ENTRY, {variables: {key: cacheKey}});
    const entry = data?.admin?.superTools?.cache?.entry;
    const parsed = parseCacheKey(cacheKey);

    return (
        <Dialog open fullWidth maxWidth="lg" data-testid="cache-entry-dialog" onClose={onClose}>
            <DialogTitle>Cache entry details</DialogTitle>
            <DialogContent dividers>
                {loading && <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}><CircularProgress/></Box>}
                {error && <Alert severity="error">{errorMessage(error)}</Alert>}
                {!loading && !error && !entry && <Alert severity="warning">This entry is no longer in the cache.</Alert>}
                {entry && (
                    <>
                        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{mb: 2}}>
                            <Meta label="Created" value={formatDate(entry.creation)}/>
                            <Meta label="Expires" value={`${formatDate(entry.expiration)} (${formatDuration(entry.timeToLive)})`}/>
                            <Meta label="Last access" value={formatDate(entry.lastAccess)}/>
                            <Meta label="Size" value={formatBytes(entry.size)}/>
                            <Meta label="Hits" value={formatNumber(entry.hitCount)}/>
                        </Stack>
                        <Tabs value={tab} sx={{borderBottom: 1, borderColor: 'divider', mb: 2}} onChange={(e, value) => setTab(value)}>
                            <Tab value="parsed" label="Parsed key"/>
                            <Tab value="content" label="Content"/>
                            <Tab value="properties" label={`Properties (${entry.properties.length})`}/>
                            <Tab value="raw" label="Raw key"/>
                        </Tabs>
                        {tab === 'parsed' && (
                            <Table size="small">
                                <TableHead>
                                    <TableRow><TableCell sx={{width: '30%'}}>Part</TableCell><TableCell>Value</TableCell></TableRow>
                                </TableHead>
                                <TableBody>
                                    {parsed.parts.map(part => {
                                        const value = parseKeyValue(part.value);
                                        return (
                                            <TableRow key={part.shortName} sx={{opacity: part.isEmpty ? 0.5 : 1}}>
                                                <TableCell>
                                                    <Typography variant="body2" fontWeight={600}>{part.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{part.shortName} (#{part.index})</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {part.isEmpty ? <em>(empty)</em> :
                                                        <Box component="pre" sx={{...mono, m: 0}}>
                                                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : part.value}
                                                        </Box>}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                        {tab === 'content' && (
                            entry.content ? (
                                <>
                                    <Typography variant="subtitle2" gutterBottom>Rendered preview</Typography>
                                    {/* Cached fragments carry author markup: render them in a sandboxed frame (opaque origin, no script), never in this page. */}
                                    <Box
                                        component="iframe"
                                        title="Cached fragment preview"
                                        sandbox=""
                                        srcDoc={entry.content}
                                        data-testid="cache-entry-preview"
                                        sx={{border: 1, borderColor: 'divider', borderRadius: 1, width: '100%', height: 300, mb: 2, bgcolor: '#fff'}}
                                    />
                                    <Typography variant="subtitle2" gutterBottom>Raw HTML</Typography>
                                    <Box component="pre" sx={{...mono, bgcolor: 'grey.100', p: 2, borderRadius: 1, maxHeight: 400, overflow: 'auto'}}>
                                        {entry.content}
                                    </Box>
                                </>
                            ) : <Alert severity="info">No content stored for this entry.</Alert>
                        )}
                        {tab === 'properties' && (
                            entry.properties.length > 0 ? (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow><TableCell sx={{width: '30%'}}>Property</TableCell><TableCell>Value</TableCell></TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {entry.properties.map(property => (
                                            <TableRow key={property.name}>
                                                <TableCell><Typography variant="body2" fontWeight={600}>{property.name}</Typography></TableCell>
                                                <TableCell><Box component="pre" sx={{...mono, m: 0}}>{property.value === null ? 'null' : property.value}</Box></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : <Alert severity="info">No extended properties for this entry.</Alert>
                        )}
                        {tab === 'raw' && (
                            <>
                                <Box component="pre" sx={{...mono, bgcolor: 'grey.100', p: 2, borderRadius: 1}}>{cacheKey}</Box>
                                <Button
                                    size="small"
                                    startIcon={<CopyIcon/>}
                                    sx={{mt: 1}}
                                    onClick={() => copyToClipboard(cacheKey).then(() => onCopied && onCopied())}
                                >
                                    Copy key
                                </Button>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Chip label={formatBytes(entry?.size || 0)} size="small" sx={{mr: 'auto', ml: 1}}/>
                <Button color="error" startIcon={<DeleteIcon/>} onClick={() => onFlush(cacheKey)}>Flush entry</Button>
                <Button data-testid="cache-entry-close" onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
