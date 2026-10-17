import {useEffect, useState} from 'react';
import {Accordion, AccordionDetails, AccordionSummary, Alert, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import {ExpandMore as ExpandIcon} from '@mui/icons-material';

/**
 * What the override file of the core context pins at startup, always visible on the page so that no persisted
 * change goes unnoticed by the next operator.
 */
export default function OverridesPanel({api, version}) {
    const [view, setView] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.overrides().then(setView).catch(e => setError(e.message));
    }, [api, version]);

    const entries = view?.entries || [];
    return (
        <Accordion disableGutters variant="outlined" sx={{mt: 2}} data-testid="bean-overrides">
            <AccordionSummary expandIcon={<ExpandIcon/>}>
                <Typography variant="h6" sx={{flexGrow: 1}}>Persisted overrides of the core context</Typography>
                <Chip label={view ? (view.storeExists ? `${entries.length} in ${view.storeFile}` : 'no override file') : '...'} size="small" sx={{mr: 2}}/>
            </AccordionSummary>
            <AccordionDetails>
                {error && <Alert severity="error">{error}</Alert>}
                {view?.storeError && <Alert severity="error">{view.storeError}</Alert>}
                {view && entries.length === 0 && !view.storeError && <Typography variant="body2" color="text.secondary">Nothing is persisted: the core context starts with its configuration files only.</Typography>}
                {entries.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell>Bean</TableCell><TableCell>Property</TableCell><TableCell>Value</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map(entry => (
                                <TableRow key={`${entry.bean}.${entry.property}`} data-testid="bean-override-row">
                                    <TableCell sx={{fontFamily: 'monospace'}}>{entry.bean}{entry.beanDenied && <Chip label="bean no longer editable" size="small" color="warning" sx={{ml: 1}}/>}</TableCell>
                                    <TableCell sx={{fontFamily: 'monospace'}}>{entry.property}</TableCell>
                                    <TableCell sx={{fontFamily: 'monospace', wordBreak: 'break-all'}}>{entry.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </AccordionDetails>
        </Accordion>
    );
}
