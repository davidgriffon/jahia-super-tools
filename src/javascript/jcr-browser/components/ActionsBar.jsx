import {useState} from 'react';
import {useQuery} from '@apollo/client';
import {Autocomplete, Button, ButtonGroup, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Menu, MenuItem, Paper, Stack, TextField, Typography} from '@mui/material';
import {
    Add as AddIcon,
    CreateNewFolder as AddNodeIcon,
    Delete as DeleteIcon,
    DriveFileMove as MoveIcon,
    DriveFileRenameOutline as RenameIcon,
    FileDownload as ExportIcon,
    Lock as LockIcon,
    LockOpen as UnlockIcon,
    PlaylistAdd as AddPropertyIcon,
    Refresh as RefreshIcon,
    SaveAs as CheckinIcon,
    Undo as CheckoutIcon
} from '@mui/icons-material';
import {NODE_TYPES} from '../graphql/queries';

function NameDialog({title, label, initial, submitLabel, testId, onSubmit, onClose}) {
    const [value, setValue] = useState(initial || '');
    return (
        <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
            <form onSubmit={event => {
                event.preventDefault();
                onClose();
                if (value.trim()) {
                    onSubmit(value.trim());
                }
            }}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus required fullWidth margin="dense" label={label} value={value} slotProps={{htmlInput: {'data-testid': `${testId}-input`}, input: {sx: {fontFamily: 'monospace'}}}} onChange={event => setValue(event.target.value)}/>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" data-testid={`${testId}-submit`}>{submitLabel}</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

function TypeDialog({title, label, mixinsOnly, sessionVars, testId, submitLabel, onSubmit, onClose, withName}) {
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const types = useQuery(NODE_TYPES, {variables: {...sessionVars, mixinsOnly}});
    const options = (types.data?.admin?.superTools?.jcr?.nodeTypes || []).filter(candidate => !candidate.abstract).map(candidate => candidate.name);
    return (
        <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
            <form onSubmit={event => {
                event.preventDefault();
                if (type.trim() && (!withName || name.trim())) {
                    onClose();
                    onSubmit(withName ? {name: name.trim(), type: type.trim()} : type.trim());
                }
            }}
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    {withName && <TextField autoFocus required fullWidth margin="dense" label="Node name" value={name} slotProps={{htmlInput: {'data-testid': `${testId}-name`}, input: {sx: {fontFamily: 'monospace'}}}} onChange={event => setName(event.target.value)}/>}
                    <Autocomplete
                        freeSolo
                        options={options}
                        loading={types.loading}
                        inputValue={type}
                        renderInput={params => <TextField {...params} autoFocus={!withName} required margin="dense" label={label} inputProps={{...params.inputProps, 'data-testid': `${testId}-input`}}/>}
                        onInputChange={(event, value) => setType(value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" data-testid={`${testId}-submit`}>{submitLabel}</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

/** Node level javax.jcr operations. Destructive ones are confirmed by the parent so every dialog shares the same look. */
export default function ActionsBar({node, workspace, sessionVars, contextPath, busy, onRefresh, onLock, onUnlock, onCheckin, onCheckout, onRename, onMove, onDelete, onAddMixin, onAddNode, onAddProperty}) {
    const [dialog, setDialog] = useState(null);
    const [deep, setDeep] = useState(false);
    const [exportAnchor, setExportAnchor] = useState(null);

    const isRoot = node.depth === 0;
    const locked = node.locked;
    const exportBase = `${contextPath}/cms/export/${workspace}${node.path === '/' ? '' : node.path}`;
    const close = () => setDialog(null);

    return (
        <Paper sx={{p: 1.5, mb: 2}}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon/>} disabled={busy} data-testid="jcr-action-refresh" onClick={onRefresh}>Refresh</Button>
                <ButtonGroup size="small" variant="outlined">
                    {locked ? (
                        <Button startIcon={<UnlockIcon/>} color="warning" disabled={busy} data-testid="jcr-action-unlock" onClick={onUnlock}>Unlock</Button>
                    ) : (
                        <Button startIcon={<LockIcon/>} disabled={busy} data-testid="jcr-action-lock" onClick={() => setDialog('lock')}>Lock</Button>
                    )}
                    {node.versionable && (node.checkedOut ? (
                        <Button startIcon={<CheckinIcon/>} disabled={busy || locked} data-testid="jcr-action-checkin" onClick={onCheckin}>Checkin</Button>
                    ) : (
                        <Button startIcon={<CheckoutIcon/>} disabled={busy || locked} data-testid="jcr-action-checkout" onClick={onCheckout}>Checkout</Button>
                    ))}
                </ButtonGroup>
                <Button size="small" variant="outlined" startIcon={<AddNodeIcon/>} disabled={busy || locked} data-testid="jcr-action-add-node" onClick={() => setDialog('addNode')}>Add node</Button>
                <Button size="small" variant="outlined" startIcon={<AddIcon/>} disabled={busy || locked} data-testid="jcr-action-add-mixin" onClick={() => setDialog('mixin')}>Add mixin</Button>
                <Button size="small" variant="outlined" startIcon={<AddPropertyIcon/>} disabled={busy || locked} data-testid="jcr-action-add-property" onClick={onAddProperty}>Add property</Button>
                <Button size="small" variant="outlined" startIcon={<RenameIcon/>} disabled={busy || isRoot || locked} data-testid="jcr-action-rename" onClick={() => setDialog('rename')}>Rename</Button>
                <Button size="small" variant="outlined" startIcon={<MoveIcon/>} disabled={busy || isRoot || locked} data-testid="jcr-action-move" onClick={() => setDialog('move')}>Move</Button>
                <Button size="small" variant="outlined" startIcon={<ExportIcon/>} data-testid="jcr-action-export" onClick={event => setExportAnchor(event.currentTarget)}>Export</Button>
                <Menu open={Boolean(exportAnchor)} anchorEl={exportAnchor} onClose={() => setExportAnchor(null)}>
                    <MenuItem component="a" href={`${exportBase}.xml?cleanup=simple`} target="_blank" rel="noopener" onClick={() => setExportAnchor(null)}>XML (simple cleanup)</MenuItem>
                    <MenuItem component="a" href={`${exportBase}.xml`} target="_blank" rel="noopener" onClick={() => setExportAnchor(null)}>XML (full)</MenuItem>
                    <MenuItem component="a" href={`${exportBase}.zip?cleanup=simple`} target="_blank" rel="noopener" onClick={() => setExportAnchor(null)}>ZIP (with binaries)</MenuItem>
                </Menu>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon/>} disabled={busy || isRoot || locked} sx={{ml: 'auto'}} data-testid="jcr-action-delete" onClick={onDelete}>Remove</Button>
            </Stack>

            {dialog === 'rename' && <NameDialog title="Rename node (Session.move)" label="New name" initial={node.name} submitLabel="Rename" testId="jcr-rename" onSubmit={onRename} onClose={close}/>}
            {dialog === 'move' && <NameDialog title="Move node (Session.move)" label="Destination path: parent path plus new name" initial={node.path} submitLabel="Move" testId="jcr-move" onSubmit={onMove} onClose={close}/>}
            {dialog === 'mixin' && <TypeDialog mixinsOnly title="Add mixin (Node.addMixin)" label="Mixin type" sessionVars={sessionVars} testId="jcr-mixin" submitLabel="Add" onSubmit={onAddMixin} onClose={close}/>}
            {dialog === 'addNode' && <TypeDialog withName mixinsOnly={false} title="Add child node (Node.addNode)" label="Primary type" sessionVars={sessionVars} testId="jcr-add-node" submitLabel="Add" onSubmit={onAddNode} onClose={close}/>}
            {dialog === 'lock' && (
                <Dialog open maxWidth="xs" fullWidth onClose={close}>
                    <DialogTitle>Lock node (LockManager.lock)</DialogTitle>
                    <DialogContent>
                        <FormControlLabel control={<Checkbox checked={deep} onChange={event => setDeep(event.target.checked)}/>} label="Deep lock (whole subtree)"/>
                        <Typography variant="caption" color="text.secondary" component="p">The lock is open-scoped: it stays until it is explicitly unlocked.</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={close}>Cancel</Button>
                        <Button variant="contained" data-testid="jcr-lock-submit" onClick={() => {
                            close();
                            onLock(deep);
                        }}
                        >
                            Lock
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Paper>
    );
}
