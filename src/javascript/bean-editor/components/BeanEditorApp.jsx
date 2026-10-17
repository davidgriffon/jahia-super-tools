import {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Alert,
    AlertTitle,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControlLabel,
    InputAdornment,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import {Dns as ServerIcon, Extension as ModuleIcon, Refresh as RefreshIcon, Save as SaveIcon, Search as SearchIcon} from '@mui/icons-material';
import {fieldsFor} from '../api';
import ConfirmDialog from '../../shared/ConfirmDialog';
import PropertyRow from './PropertyRow';
import OverridesPanel from './OverridesPanel';

function Messages({result, error}) {
    if (error) {
        return <Alert severity="error" sx={{my: 1.5}} data-testid="bean-error"><AlertTitle>Error</AlertTitle>{error}</Alert>;
    }
    if (!result) {
        return null;
    }
    const lists = [
        ['Updated in memory', result.changed],
        ['Restored to the configured value', result.restored],
        ['Persisted in the override file', result.persisted],
        ['Removed from the override file', result.unpersisted]
    ].filter(([, names]) => names && names.length > 0);
    const isEmpty = lists.length === 0 && result.errors.length === 0;
    return (
        <Stack spacing={1} sx={{my: 1.5}} data-testid="bean-result">
            {lists.map(([label, names]) => <Alert key={label} severity="info"><AlertTitle>{label}</AlertTitle>{names.join(', ')}</Alert>)}
            {result.notices.length > 0 && (
                <Alert severity="warning"><AlertTitle>Applied in memory only</AlertTitle>{result.notices.map(notice => <div key={notice}>{notice}</div>)}</Alert>
            )}
            {result.errors.length > 0 && (
                <Alert severity="error"><AlertTitle>Not applied</AlertTitle>{result.errors.map(message => <div key={message}>{message}</div>)}</Alert>
            )}
            {isEmpty && <Alert severity="info">No value was changed.</Alert>}
        </Stack>
    );
}

export default function BeanEditorApp({api}) {
    const [contexts, setContexts] = useState(null);
    const [context, setContext] = useState(null);
    const [beansView, setBeansView] = useState(null);
    const [beanName, setBeanName] = useState(null);
    const [bean, setBean] = useState(null);
    const [isLoadingBean, setIsLoadingBean] = useState(false);
    const [edits, setEdits] = useState({});
    const [mode, setMode] = useState('memory');
    const [filter, setFilter] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [confirmSave, setConfirmSave] = useState(false);
    const [overridesVersion, setOverridesVersion] = useState(0);

    useEffect(() => {
        api.contexts().then(view => setContexts(view.contexts)).catch(e => setError(e.message));
    }, [api]);

    const loadBean = useCallback((contextId, name) => {
        setIsLoadingBean(true);
        setEdits({});
        return api.bean(contextId, name)
            .then(view => setBean(view.bean))
            .catch(e => setError(e.message))
            .finally(() => setIsLoadingBean(false));
    }, [api]);

    const selectContext = selected => {
        setContext(selected);
        setBeansView(null);
        setBeanName(null);
        setBean(null);
        setResult(null);
        setError(null);
        setEdits({});
        if (selected) {
            api.beans(selected.id).then(setBeansView).catch(e => setError(e.message));
        }
    };

    const selectBean = name => {
        setBeanName(name);
        setBean(null);
        setResult(null);
        setError(null);
        setFilter('');
        if (name) {
            loadBean(context.id, name);
        }
    };

    const onEdit = (name, change) => setEdits(previous => ({...previous, [name]: {...previous[name], ...change}}));

    const save = () => {
        setConfirmSave(false);
        setIsSaving(true);
        setError(null);
        api.save(context.id, beanName, mode, fieldsFor(edits))
            .then(view => {
                setResult(view.result);
                setBean(view.bean);
                setEdits({});
                setOverridesVersion(version => version + 1);
            })
            .catch(e => setError(e.message))
            .finally(() => setIsSaving(false));
    };

    const editedNames = Object.entries(edits).filter(([, edit]) => Object.keys(edit).length > 0).map(([name]) => name);
    // The core context is the platform itself: ask before touching it.
    const requestSave = () => (context?.persistable ? setConfirmSave(true) : save());

    const visibleProperties = useMemo(() => {
        if (!bean) {
            return [];
        }
        const needle = filter.trim().toLowerCase();
        return needle ? bean.properties.filter(property => property.name.toLowerCase().includes(needle)) : bean.properties;
    }, [bean, filter]);

    const hasEdits = Object.values(edits).some(edit => Object.keys(edit).length > 0);
    const isPersistable = Boolean(bean && bean.persistable);

    return (
        <Box>
            <Paper sx={{p: 2, mb: 2}}>
                <Stack direction={{xs: 'column', md: 'row'}} spacing={2}>
                    <Autocomplete
                        sx={{flex: 1}}
                        options={contexts || []}
                        value={context}
                        loading={contexts === null}
                        getOptionLabel={option => option.label}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderOption={(props, option) => {
                            const {key, ...rest} = props;
                            return (
                                <li key={key} {...rest}>
                                    {option.persistable ? <ServerIcon fontSize="small" sx={{mr: 1, color: 'primary.main'}}/> : <ModuleIcon fontSize="small" sx={{mr: 1, color: 'text.secondary'}}/>}
                                    <Box>
                                        <Typography variant="body2">{option.label}</Typography>
                                        <Typography variant="caption" color="text.secondary">{option.beanCount} beans{option.persistable ? ', changes can be persisted' : ''}</Typography>
                                    </Box>
                                </li>
                            );
                        }}
                        renderInput={params => <TextField {...params} size="small" label="Spring context" placeholder="Select a Spring context" inputProps={{...params.inputProps, 'data-testid': 'bean-context-input'}}/>}
                        onChange={(event, value) => selectContext(value)}
                    />
                    <Autocomplete
                        sx={{flex: 1}}
                        options={beansView ? beansView.beans : []}
                        value={beanName}
                        disabled={!context}
                        loading={Boolean(context) && beansView === null}
                        renderInput={params => (
                            <TextField
                                {...params}
                                size="small"
                                label={`Bean${beansView ? ` (${beansView.beans.length} instantiated singletons)` : ''}`}
                                placeholder={context ? 'Search a bean by name' : 'Select a context first'}
                                inputProps={{...params.inputProps, 'data-testid': 'bean-name-input'}}
                            />
                        )}
                        onChange={(event, value) => selectBean(value)}
                    />
                </Stack>
                {beansView && (
                    <Typography variant="caption" color="text.secondary" component="p" sx={{mt: 1.5}}>
                        {beansView.persistable ?
                            <>Persistence: override file <code>{beansView.storeFile}</code> {beansView.storeExists ? '(present)' : '(not created yet)'}, loaded by the core context at startup.</> :
                            'Persistence is not available for a module context: module Spring contexts only load the XML files packaged in the module bundle, not the WEB-INF/etc/spring override folder. Changes are kept in memory until the module or the server restarts.'}
                    </Typography>
                )}
            </Paper>

            {!bean && error && <Messages error={error}/>}
            {isLoadingBean && <Paper sx={{p: 4, display: 'flex', justifyContent: 'center'}}><CircularProgress/></Paper>}

            {bean && !isLoadingBean && (
                <Paper sx={{p: 2}}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{mb: 0.5}}>
                        <Typography variant="h5" data-testid="bean-name">{bean.name}</Typography>
                        <Chip label={bean.className} size="small" variant="outlined" sx={{fontFamily: 'monospace'}}/>
                        {bean.persistedCount > 0 && <Chip label={`${bean.persistedCount} persisted override${bean.persistedCount > 1 ? 's' : ''}`} size="small" color="success"/>}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" component="p">
                        Defined in {bean.definitionResource ? <code>{bean.definitionResource}</code> : <em>unknown</em>}
                    </Typography>
                    {bean.definitionOverridden && (
                        <Alert severity="warning" sx={{mt: 1.5}}>
                            <AlertTitle>This bean definition is overridden</AlertTitle>
                            It does not come from the product configuration but from an override file, so the configured values shown below are those of the override, not the product defaults.
                        </Alert>
                    )}
                    {bean.storeError && <Alert severity="error" sx={{mt: 1.5}}><AlertTitle>Override file unreadable</AlertTitle>{bean.storeError}</Alert>}

                    <Messages result={result} error={error}/>

                    {bean.properties.length === 0 ? (
                        <Alert severity="info" sx={{mt: 2}}>This bean has no String or primitive property.</Alert>
                    ) : (
                        <>
                            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{my: 2}}>
                                <TextField
                                    size="small"
                                    placeholder="Filter properties"
                                    value={filter}
                                    sx={{width: 360}}
                                    slotProps={{htmlInput: {'data-testid': 'bean-filter'}, input: {startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment>}}}
                                    onChange={event => setFilter(event.target.value)}
                                />
                                <Chip label={`${visibleProperties.length} / ${bean.properties.length} properties`} size="small" data-testid="bean-property-count"/>
                            </Stack>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Property</TableCell>
                                        <TableCell sx={{width: 90}}>Type</TableCell>
                                        <TableCell>Value</TableCell>
                                        <TableCell sx={{width: 60}} align="center">null</TableCell>
                                        <TableCell sx={{width: 320}}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {visibleProperties.map(property => (
                                        <PropertyRow
                                            key={property.name}
                                            property={property}
                                            edit={edits[property.name] || {}}
                                            isContextPersistable={isPersistable}
                                            onEdit={change => onEdit(property.name, change)}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                            <Stack direction={{xs: 'column', md: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} sx={{mt: 2}}>
                                {isPersistable ? (
                                    <RadioGroup row name="mode" value={mode} onChange={event => setMode(event.target.value)}>
                                        <FormControlLabel value="memory" control={<Radio size="small" data-testid="bean-mode-memory"/>} label={<Box><Typography variant="body2">Apply in memory only</Typography><Typography variant="caption" color="text.secondary">Lost on restart</Typography></Box>}/>
                                        <FormControlLabel value="persist" control={<Radio size="small" data-testid="bean-mode-persist"/>} label={<Box><Typography variant="body2">Apply in memory and persist</Typography><Typography variant="caption" color="text.secondary">Written to the override file, applied at every startup</Typography></Box>}/>
                                    </RadioGroup>
                                ) : (
                                    <Typography variant="caption" color="text.secondary">Changes are applied in memory only.</Typography>
                                )}
                                <Stack direction="row" spacing={1}>
                                    <Button variant="text" disabled={!hasEdits || isSaving} data-testid="bean-discard" onClick={() => setEdits({})}>Discard edits</Button>
                                    <Button variant="outlined" startIcon={<RefreshIcon/>} disabled={isSaving} data-testid="bean-reload" onClick={() => {
                                        setResult(null);
                                        loadBean(context.id, beanName);
                                    }}
                                    >
                                        Reload
                                    </Button>
                                    <Button variant="contained" startIcon={isSaving ? <CircularProgress size={16} color="inherit"/> : <SaveIcon/>} disabled={!hasEdits || isSaving} data-testid="bean-save" onClick={requestSave}>Save changes</Button>
                                </Stack>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" component="p" sx={{mt: 1.5}}>
                                Only edited rows are applied, through the setter of the bean; a property without a setter is read only.
                                The <em>null</em> box is checked when the current value is null: type a value or uncheck it to set one. An empty
                                text sets an empty String; it sets null for a number or boolean wrapper.
                                {isPersistable && ' A persisted override needs a setter and cannot be null; setting a persisted property to null removes its override.'}
                            </Typography>
                        </>
                    )}
                </Paper>
            )}

            <OverridesPanel api={api} version={overridesVersion}/>

            <ConfirmDialog
                open={confirmSave}
                title={mode === 'persist' ? 'Change and persist platform settings' : 'Change platform settings in memory'}
                message={`Apply ${editedNames.length} change${editedNames.length === 1 ? '' : 's'} to ${beanName} of the Jahia core context (${editedNames.join(', ')})?`
                    + (mode === 'persist' ? ' The values are also written to the override file and applied at every startup.' : ' The values are lost at the next restart.')
                    + ' The change is recorded in the server log.'}
                confirmLabel="Apply"
                color="warning"
                onCancel={() => setConfirmSave(false)}
                onConfirm={save}
            />
        </Box>
    );
}
