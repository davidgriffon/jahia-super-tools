import {Box, Checkbox, Chip, FormControlLabel, MenuItem, Select, TableCell, TableRow, TextField, Tooltip, Typography} from '@mui/material';

const STATUS_COLORS = {
    DEFAULT: 'default',
    CONFIGURED: 'primary',
    MEMORY: 'warning',
    PERSISTED: 'success',
    PERSISTED_PENDING: 'error'
};

const NULL_OPTION = '__null__';

function ActionCheck({label, title, checked, onChange}) {
    return (
        <Tooltip title={title} placement="top-start">
            <FormControlLabel
                sx={{m: 0, '& .MuiFormControlLabel-label': {fontSize: '0.75rem'}}}
                control={<Checkbox size="small" checked={checked} sx={{p: 0.25, mr: 0.5}} onChange={event => onChange(event.target.checked)}/>}
                label={label}
            />
        </Tooltip>
    );
}

function ValueCell({property, text, isNull, edit, onEdit}) {
    if (property.sensitive) {
        return <Typography variant="body2" color="text.secondary" fontStyle="italic" title="Sensitive property: masked and read only" data-testid="bean-value-masked">{property.value || '(not readable)'}</Typography>;
    }
    if (!property.writable) {
        let shown = property.value;
        if (!property.readable) {
            shown = '(not readable)';
        } else if (shown === null) {
            shown = 'null';
        }
        return <Typography variant="body2" color="text.secondary" fontStyle="italic" title="No setter and no writable field">{shown}</Typography>;
    }
    if (property.boolean) {
        let value = isNull ? NULL_OPTION : text;
        if (!property.readable && edit.text === undefined && !edit.isNull) {
            value = '';
        }
        return (
            <Select
                displayEmpty
                size="small"
                value={value}
                sx={{minWidth: 120}}
                data-testid="bean-value-select"
                onChange={event => onEdit(event.target.value === NULL_OPTION ? {isNull: true, text: ''} : {isNull: false, text: event.target.value})}
            >
                {value === '' && <MenuItem value=""><em>(not readable)</em></MenuItem>}
                {!property.primitive && <MenuItem value={NULL_OPTION}><em>null</em></MenuItem>}
                <MenuItem value="true">true</MenuItem>
                <MenuItem value="false">false</MenuItem>
            </Select>
        );
    }
    let placeholder = '';
    if (!property.readable) {
        placeholder = '(not readable)';
    } else if (isNull) {
        placeholder = 'null';
    }
    return (
        <TextField
            fullWidth
            size="small"
            value={isNull ? '' : text}
            placeholder={placeholder}
            slotProps={{htmlInput: {'data-testid': 'bean-value-input'}, input: {sx: {fontFamily: 'monospace', fontSize: '0.8rem'}}}}
            onChange={event => onEdit({text: event.target.value, isNull: false})}
        />
    );
}

/**
 * One editable property: its value control, the null box, and the status cell with the per-property actions.
 * `edit` holds what the user changed on this row and is merged by `onEdit`.
 */
export default function PropertyRow({property, edit, isContextPersistable, onEdit}) {
    const isEdited = Object.keys(edit).length > 0;
    // The null box is pre-checked only when the value is known to be null: an unreadable value is unknown.
    const isNull = edit.isNull === undefined ? (property.readable && property.value === null) : edit.isNull;
    const text = edit.text === undefined ? (property.value || '') : edit.text;

    const showRestore = property.writable && property.configuredValue !== null && property.status !== 'CONFIGURED';
    const showPersistCurrent = isContextPersistable && property.persistable && property.value !== null &&
        (property.status === 'MEMORY' || property.status === 'PERSISTED_PENDING');
    const showUnpersist = isContextPersistable && property.persistedValue !== null;

    return (
        <TableRow hover data-testid="bean-property-row" data-property={property.name} sx={isEdited ? {'& td': {bgcolor: '#fff8e6'}, '& td:first-of-type': {boxShadow: 'inset 4px 0 0 #e0a000'}} : undefined}>
            <TableCell sx={{verticalAlign: 'top'}}>
                <Typography variant="body2" sx={{fontFamily: 'monospace', whiteSpace: 'nowrap'}} title={`reached through ${property.source}`}>{property.name}</Typography>
            </TableCell>
            <TableCell sx={{verticalAlign: 'top'}}><Chip label={property.type} size="small" variant="outlined"/></TableCell>
            <TableCell sx={{verticalAlign: 'top'}}>
                <ValueCell property={property} text={text} isNull={isNull} edit={edit} onEdit={onEdit}/>
            </TableCell>
            <TableCell align="center" sx={{verticalAlign: 'top'}}>
                {property.writable && !property.primitive && (
                    <Checkbox size="small" checked={isNull} title={`Set ${property.name} to null`} onChange={event => onEdit({isNull: event.target.checked, text: event.target.checked ? '' : text})}/>
                )}
            </TableCell>
            <TableCell sx={{verticalAlign: 'top'}}>
                <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5}}>
                    <Tooltip title={property.statusDescription} placement="top-start">
                        <Chip label={property.statusLabel} size="small" color={STATUS_COLORS[property.status] || 'default'} data-testid="bean-property-status"/>
                    </Tooltip>
                    {property.sensitive && <Chip label="sensitive, masked" size="small" color="warning" variant="outlined"/>}
                    {property.persistedValue !== null && (
                        <Typography variant="caption" color="text.secondary">persisted: <code>{property.persistedValue}</code></Typography>
                    )}
                    {property.configuredValue !== null && property.status !== 'CONFIGURED' && (
                        <Typography variant="caption" color="text.secondary">configured: <code>{property.configuredValue}</code></Typography>
                    )}
                    {property.configuredByReference && (
                        <Typography variant="caption" color="text.secondary">configured by reference or expression</Typography>
                    )}
                    {isContextPersistable && property.writable && !property.persistable && (
                        <Typography variant="caption" color="text.secondary">no setter: memory only</Typography>
                    )}
                    {showRestore && (
                        <ActionCheck
                            label="restore configured value"
                            title="Put the value of the Spring configuration file back in memory at save, and remove the persisted override if there is one"
                            checked={Boolean(edit.restore)}
                            onChange={checked => onEdit({restore: checked})}
                        />
                    )}
                    {showPersistCurrent && (
                        <ActionCheck
                            label="persist current value"
                            title="Write the value currently in memory to the override file at save"
                            checked={Boolean(edit.persistCurrent)}
                            onChange={checked => onEdit({persistCurrent: checked})}
                        />
                    )}
                    {showUnpersist && (
                        <ActionCheck
                            label="remove override"
                            title="Remove the persisted override at save; the value in memory is kept"
                            checked={Boolean(edit.unpersist)}
                            onChange={checked => onEdit({unpersist: checked})}
                        />
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
}
