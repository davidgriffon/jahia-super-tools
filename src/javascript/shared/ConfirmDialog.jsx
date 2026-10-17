import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from '@mui/material';

/** Generic confirmation dialog, used instead of window.confirm so the page never blocks. */
export default function ConfirmDialog({open, title, message, confirmLabel = 'Confirm', color = 'primary', onConfirm, onCancel}) {
    return (
        <Dialog open={open} maxWidth="sm" fullWidth data-testid="confirm-dialog" onClose={onCancel}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText component="div" sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button data-testid="confirm-dialog-cancel" onClick={onCancel}>Cancel</Button>
                <Button variant="contained" color={color} data-testid="confirm-dialog-confirm" onClick={onConfirm}>{confirmLabel}</Button>
            </DialogActions>
        </Dialog>
    );
}
