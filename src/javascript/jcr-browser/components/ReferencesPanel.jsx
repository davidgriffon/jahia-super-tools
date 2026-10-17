import {useLazyQuery} from '@apollo/client';
import {Accordion, AccordionDetails, AccordionSummary, Alert, Chip, CircularProgress, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import {ExpandMore as ExpandIcon} from '@mui/icons-material';
import {NODE_REFERENCES} from '../graphql/queries';
import {errorMessage} from '../../shared/apollo';

/** Node.getReferences and Node.getWeakReferences, loaded on demand. */
export default function ReferencesPanel({uuid, sessionVars, count, onNavigate}) {
    const [load, {data, loading, error, called}] = useLazyQuery(NODE_REFERENCES, {variables: {...sessionVars, uuid}});
    const references = data?.admin?.superTools?.jcr?.node?.references || [];

    return (
        <Accordion disableGutters variant="outlined" data-testid="jcr-references" onChange={(event, expanded) => expanded && !called && load()}>
            <AccordionSummary expandIcon={<ExpandIcon/>}>
                <Typography variant="h6" sx={{flexGrow: 1}}>References to this node</Typography>
                <Chip label={count} size="small" sx={{mr: 2}}/>
            </AccordionSummary>
            <AccordionDetails>
                {loading && <CircularProgress size={20}/>}
                {error && <Alert severity="error">{errorMessage(error)}</Alert>}
                {called && !loading && !error && references.length === 0 && <Typography variant="body2" color="text.secondary">No REFERENCE or WEAKREFERENCE property points to this node.</Typography>}
                {references.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell>Referencing node</TableCell><TableCell>Type</TableCell><TableCell>Property</TableCell><TableCell>Kind</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {references.map(reference => (
                                <TableRow key={reference.propertyPath} hover>
                                    <TableCell>
                                        <Link component="button" underline="hover" sx={{fontFamily: 'monospace', textAlign: 'left'}} onClick={() => onNavigate(reference.node.uuid)}>{reference.node.path}</Link>
                                    </TableCell>
                                    <TableCell><Chip label={reference.node.primaryType} size="small" variant="outlined"/></TableCell>
                                    <TableCell sx={{fontFamily: 'monospace'}}>{reference.propertyName}</TableCell>
                                    <TableCell>{reference.weak ? 'WEAKREFERENCE' : 'REFERENCE'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {count > references.length && references.length > 0 && (
                    <Typography variant="caption" color="text.secondary">Showing the first {references.length} of {count} references.</Typography>
                )}
            </AccordionDetails>
        </Accordion>
    );
}
