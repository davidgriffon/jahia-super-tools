import {useCallback, useState} from 'react';
import {Alert, Snackbar} from '@mui/material';

/**
 * Small snackbar helper: `const {notify, notification} = useNotification();` then render `{notification}`.
 */
export function useNotification() {
    const [state, setState] = useState({open: false, message: '', severity: 'info'});
    const notify = useCallback((severity, message) => setState({open: true, severity, message}), []);
    const close = useCallback(() => setState(prev => ({...prev, open: false})), []);
    const notification = (
        <Snackbar open={state.open} autoHideDuration={6000} anchorOrigin={{vertical: 'bottom', horizontal: 'right'}} onClose={close}>
            <Alert severity={state.severity} variant="filled" sx={{width: '100%'}} data-testid="notification" onClose={close}>{state.message}</Alert>
        </Snackbar>
    );
    return {notify, notification};
}
