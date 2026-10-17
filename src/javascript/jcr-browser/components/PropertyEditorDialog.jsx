import {useEffect, useState} from 'react';
import {Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, TextField, Typography} from '@mui/material';
import {PROPERTY_TYPES, fromDateTimeLocal, propertyValues, toDateTimeLocal} from '../utils';

/**
 * Edits an existing property (name and type fixed) or creates a new one. `onSave` receives
 * {name, type, multiple, values}: `values` is always an array, single-valued properties use values[0].
 */
export default function PropertyEditorDialog({open, property, onSave, onCancel}) {
    const editing = Boolean(property);
    const [name, setName] = useState('');
    const [type, setType] = useState('STRING');
    const [multiple, setMultiple] = useState(false);
    const [text, setText] = useState('');
    const [bool, setBool] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }
        setError('');
        if (property) {
            const values = propertyValues(property);
            setName(property.name);
            setType(property.type || 'STRING');
            setMultiple(Boolean(property.multiple));
            if (property.type === 'BOOLEAN' && !property.multiple) {
                setBool(values[0] === 'true');
            } else if (property.type === 'DATE' && !property.multiple) {
                setText(toDateTimeLocal(values[0]));
            } else {
                setText(values.join('\n'));
            }
        } else {
            setName('');
            setType('STRING');
            setMultiple(false);
            setText('');
            setBool(false);
        }
    }, [open, property]);

    const submit = event => {
        event.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('A property name is required');
            return;
        }
        let values;
        if (type === 'BOOLEAN' && !multiple) {
            values = [String(bool)];
        } else if (type === 'DATE' && !multiple) {
            values = [fromDateTimeLocal(text)];
        } else if (multiple) {
            values = text.split('\n').map(value => value.trim()).filter(Boolean);
        } else {
            values = [text];
        }
        if ((type === 'LONG' || type === 'DOUBLE' || type === 'DECIMAL') && values.some(value => isNaN(Number(value)))) {
            setError('Please enter numeric values only');
            return;
        }
        onSave({name: name.trim(), type, multiple, values});
    };

    const renderValueInput = () => {
        if (type === 'BINARY') {
            return <Alert severity="info">Binary properties cannot be edited here.</Alert>;
        }
        if (multiple) {
            return <TextField fullWidth multiline minRows={4} label="Values (one per line)" value={text} slotProps={{htmlInput: {'data-testid': 'jcr-property-value-input'}}} onChange={event => setText(event.target.value)}/>;
        }
        if (type === 'BOOLEAN') {
            return <FormControlLabel control={<Switch checked={bool} onChange={event => setBool(event.target.checked)}/>} label={bool ? 'true' : 'false'}/>;
        }
        if (type === 'DATE') {
            return <TextField fullWidth type="datetime-local" label="Date" value={text} slotProps={{inputLabel: {shrink: true}, htmlInput: {step: 1, 'data-testid': 'jcr-property-value-input'}}} onChange={event => setText(event.target.value)}/>;
        }
        if (type === 'LONG' || type === 'DOUBLE' || type === 'DECIMAL') {
            return <TextField fullWidth type="number" label="Value" value={text} slotProps={{htmlInput: {step: type === 'LONG' ? 1 : 'any', 'data-testid': 'jcr-property-value-input'}}} onChange={event => setText(event.target.value)}/>;
        }
        return (
            <TextField
                fullWidth
                multiline={type === 'STRING'}
                minRows={type === 'STRING' ? 3 : 1}
                label="Value"
                value={text}
                placeholder={type === 'REFERENCE' || type === 'WEAKREFERENCE' ? 'Identifier of the referenced node' : ''}
                slotProps={{htmlInput: {'data-testid': 'jcr-property-value-input'}, input: {sx: {fontFamily: 'monospace'}}}}
                onChange={event => setText(event.target.value)}
            />
        );
    };

    return (
        <Dialog open={open} fullWidth maxWidth="sm" data-testid="jcr-property-dialog" onClose={onCancel}>
            <form onSubmit={submit}>
                <DialogTitle>
                    {editing ? 'Edit property (Node.setProperty)' : 'Add property (Node.setProperty)'}
                    {editing && (
                        <Stack direction="row" spacing={1} sx={{mt: 0.5}}>
                            <Typography variant="body2" sx={{fontFamily: 'monospace'}}>{property.name}</Typography>
                            <Chip label={type} size="small"/>
                            {multiple && <Chip label="multiple" size="small" color="secondary"/>}
                        </Stack>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{mt: 1}}>
                        {!editing && (
                            <>
                                <TextField autoFocus required fullWidth label="Name" value={name} placeholder="jcr:title, j:myProperty..." slotProps={{htmlInput: {'data-testid': 'jcr-property-name'}, input: {sx: {fontFamily: 'monospace'}}}} onChange={event => setName(event.target.value)}/>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <FormControl size="small" sx={{minWidth: 180}}>
                                        <InputLabel>PropertyType</InputLabel>
                                        <Select value={type} label="PropertyType" data-testid="jcr-property-type" onChange={event => setType(event.target.value)}>
                                            {PROPERTY_TYPES.map(option => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    <FormControlLabel control={<Switch checked={multiple} onChange={event => setMultiple(event.target.checked)}/>} label="Multiple"/>
                                </Stack>
                            </>
                        )}
                        {renderValueInput()}
                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={type === 'BINARY'} data-testid="jcr-property-save">Save</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
