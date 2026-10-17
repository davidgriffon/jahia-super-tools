import {useMemo, useState} from 'react';
import {Box, Chip, FormControlLabel, IconButton, InputAdornment, Link, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography} from '@mui/material';
import {Delete as DeleteIcon, Edit as EditIcon, Lock as ProtectedIcon, Search as SearchIcon} from '@mui/icons-material';
import {REFERENCE_TYPES, compareNames, propertyValues} from '../utils';
import {formatBytes, formatDate} from '../../shared/format';

const MAX_INLINE = 300;

function Value({property, value, onNavigate}) {
    const [expanded, setExpanded] = useState(false);
    if (value === null || value === undefined) {
        return <em>null</em>;
    }
    if (REFERENCE_TYPES.includes(property.type)) {
        const target = (property.referencedNodes || []).find(ref => ref.uuid === value);
        return (
            <Link component="button" underline="hover" sx={{fontFamily: 'monospace', textAlign: 'left'}} title={target ? `${target.path} (${target.primaryType})` : 'Dangling reference'} onClick={() => onNavigate(value)}>
                {value}{target ? ` → ${target.path}` : ' (dangling)'}
            </Link>
        );
    }
    if (property.type === 'BOOLEAN') {
        return <Chip label={value} size="small" color={value === 'true' ? 'success' : 'default'} variant="outlined"/>;
    }
    if (property.type === 'DATE') {
        return <span>{value} <Typography component="span" variant="caption" color="text.secondary">({formatDate(value)} local)</Typography></span>;
    }
    const text = String(value);
    if (text.length > MAX_INLINE && !expanded) {
        return <span>{text.substring(0, MAX_INLINE)}… <Link component="button" underline="hover" onClick={() => setExpanded(true)}>show all ({text.length} chars)</Link></span>;
    }
    return <span>{text}</span>;
}

export default function PropertiesPanel({properties, locked, onEdit, onRemove, onNavigate}) {
    const [search, setSearch] = useState('');
    const [sorted, setSorted] = useState(false);
    const list = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const filtered = properties.filter(property => !needle || property.name.toLowerCase().includes(needle) || propertyValues(property).some(value => String(value).toLowerCase().includes(needle)));
        return sorted ? [...filtered].sort(compareNames) : filtered;
    }, [properties, search, sorted]);

    return (
        <Paper sx={{p: 2, mb: 2}} data-testid="jcr-properties">
            <Stack direction="row" spacing={2} alignItems="center" sx={{mb: 1.5}}>
                <Typography variant="h6" sx={{flexGrow: 1}}>Properties ({list.length}{list.length !== properties.length ? ` / ${properties.length}` : ''})</Typography>
                <FormControlLabel control={<Switch size="small" checked={sorted} onChange={event => setSorted(event.target.checked)}/>} label="Sort by name"/>
                <TextField size="small" placeholder="Filter name or value" value={search} slotProps={{htmlInput: {'data-testid': 'jcr-properties-filter'}, input: {startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment>}}} sx={{width: 260}} onChange={event => setSearch(event.target.value)}/>
            </Stack>
            <Table size="small" sx={{tableLayout: 'fixed'}}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{width: '28%'}}>Name</TableCell>
                        <TableCell sx={{width: 150}}>Type</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell sx={{width: 90}} align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {list.map(property => {
                        const definition = property.definition;
                        const values = propertyValues(property);
                        const readOnly = property.protected || locked;
                        const binary = property.type === 'BINARY';
                        return (
                            <TableRow key={property.path} hover data-testid="jcr-property-row" data-property={property.name}>
                                <TableCell sx={{wordBreak: 'break-all'}}>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap'}}>
                                        <Typography variant="body2" fontWeight={600} sx={{fontFamily: 'monospace'}}>{property.name}</Typography>
                                        {definition?.mandatory && <Tooltip title="Mandatory"><Typography component="span" color="error.main">*</Typography></Tooltip>}
                                        {property.protected && <Tooltip title="Protected: managed by the repository, read only"><ProtectedIcon sx={{fontSize: 14, color: 'text.secondary'}} data-testid="jcr-property-protected"/></Tooltip>}
                                        {definition?.autoCreated && <Chip label="autocreated" size="small" variant="outlined" sx={{height: 18}}/>}
                                        {property.internationalized && <Chip label={`i18n ${property.locale}`} size="small" color="info" variant="outlined" sx={{height: 18}} data-testid="jcr-property-i18n"/>}
                                    </Box>
                                    {definition && (
                                        <Typography variant="caption" color="text.secondary" sx={{fontFamily: 'monospace'}}>{definition.declaringNodeType}.{definition.name}</Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip label={`${property.type}${property.multiple ? ' []' : ''}`} size="small" variant="outlined"/>
                                    {binary && <Typography variant="caption" color="text.secondary" display="block">{formatBytes(property.lengths?.[0] || 0)}</Typography>}
                                </TableCell>
                                <TableCell sx={{fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-word', whiteSpace: 'pre-wrap'}} data-testid="jcr-property-value">
                                    {values.length === 0 ? <em>empty</em> : property.multiple ? (
                                        <Box component="ol" sx={{m: 0, pl: 2.5}}>
                                            {values.map((value, index) => (
                                                // Values of a multi-valued property can repeat, the index is the only stable key.
                                                // eslint-disable-next-line react/no-array-index-key
                                                <li key={index}><Value property={property} value={value} onNavigate={onNavigate}/></li>
                                            ))}
                                        </Box>
                                    ) : <Value property={property} value={values[0]} onNavigate={onNavigate}/>}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title={readOnly ? 'Read only' : 'Edit'}>
                                        <span><IconButton size="small" disabled={readOnly || binary} data-testid="jcr-property-edit" onClick={() => onEdit(property)}><EditIcon fontSize="small"/></IconButton></span>
                                    </Tooltip>
                                    <Tooltip title={readOnly ? 'Read only' : 'Remove'}>
                                        <span><IconButton size="small" color="error" disabled={readOnly} data-testid="jcr-property-remove" onClick={() => onRemove(property)}><DeleteIcon fontSize="small"/></IconButton></span>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {list.length === 0 && (
                        <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No property matches.</Typography></TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </Paper>
    );
}
