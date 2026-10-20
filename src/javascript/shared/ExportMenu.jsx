import {useState} from 'react';
import {Button, CircularProgress, ListItemText, Menu, MenuItem} from '@mui/material';
import {FileDownload as ExportIcon} from '@mui/icons-material';
import {FORMATS, runExport} from './export';

/**
 * "Export" button with one menu entry per format the tool offers.
 *
 * @param {Array<string>} formats subset of json, csv, xml
 * @param {object|function} spec see runExport, or a function returning it (or a promise of it) at click time
 * @param {object} descriptions optional one-line hint per format
 */
export default function ExportMenu({formats, spec, descriptions = {}, disabled, onExported, onError, size = 'small', testId = 'export'}) {
    const [anchor, setAnchor] = useState(null);
    const [busy, setBusy] = useState(false);
    const pick = format => {
        setAnchor(null);
        setBusy(true);
        Promise.resolve(typeof spec === 'function' ? spec(format) : spec)
            .then(resolved => {
                const fileName = runExport(format, resolved);
                if (onExported) {
                    onExported(fileName);
                }
            })
            .catch(error => (onError ? onError(error) : console.error('Export failed', error)))
            .finally(() => setBusy(false));
    };
    return (
        <>
            <Button variant="outlined" size={size} startIcon={busy ? <CircularProgress size={14} color="inherit"/> : <ExportIcon/>} disabled={disabled || busy} data-testid={testId} onClick={event => setAnchor(event.currentTarget)}>
                Export
            </Button>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                {formats.map(format => (
                    <MenuItem key={format} data-testid={`${testId}-${format}`} onClick={() => pick(format)}>
                        <ListItemText primary={FORMATS[format].label} secondary={descriptions[format]}/>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
