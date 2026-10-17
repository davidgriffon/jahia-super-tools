import {useLazyQuery} from '@apollo/client';
import {Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import {ExpandMore as ExpandIcon, Restore as RestoreIcon} from '@mui/icons-material';
import {NODE_VERSIONS} from '../graphql/queries';
import {errorMessage} from '../../shared/apollo';
import {formatDate} from '../../shared/format';

/** VersionHistory of a mix:versionable node, loaded on demand. */
export default function VersionsPanel({uuid, sessionVars, baseVersion, busy, onRestore}) {
    const [load, {data, loading, error, called, refetch}] = useLazyQuery(NODE_VERSIONS, {variables: {...sessionVars, uuid}});
    const node = data?.admin?.superTools?.jcr?.node;
    const versions = node?.versions || [];

    return (
        <Accordion disableGutters variant="outlined" sx={{mt: 2}} data-testid="jcr-versions" onChange={(event, expanded) => expanded && (called ? refetch() : load())}>
            <AccordionSummary expandIcon={<ExpandIcon/>}>
                <Typography variant="h6" sx={{flexGrow: 1}}>Version history</Typography>
                {baseVersion && <Chip label={`base ${baseVersion}`} size="small" sx={{mr: 2}}/>}
            </AccordionSummary>
            <AccordionDetails>
                {loading && <CircularProgress size={20}/>}
                {error && <Alert severity="error">{errorMessage(error)}</Alert>}
                {called && !loading && !error && versions.length === 0 && <Typography variant="body2" color="text.secondary">No version yet.</Typography>}
                {versions.length > 0 && (
                    <Table size="small">
                        <TableHead>
                            <TableRow><TableCell>Version</TableCell><TableCell>Created</TableCell><TableCell>Labels</TableCell><TableCell>Predecessors</TableCell><TableCell>Frozen type</TableCell><TableCell align="right">Actions</TableCell></TableRow>
                        </TableHead>
                        <TableBody>
                            {versions.map(version => (
                                <TableRow key={version.uuid} hover selected={version.name === node?.baseVersion}>
                                    <TableCell sx={{fontFamily: 'monospace'}}>{version.name}{version.rootVersion ? ' (root)' : ''}{version.name === node?.baseVersion ? ' (base)' : ''}</TableCell>
                                    <TableCell>{formatDate(version.created)}</TableCell>
                                    <TableCell>{version.labels.join(', ')}</TableCell>
                                    <TableCell sx={{fontFamily: 'monospace'}}>{version.predecessors.join(', ')}</TableCell>
                                    <TableCell sx={{fontFamily: 'monospace'}}>{version.frozenPrimaryType || ''}</TableCell>
                                    <TableCell align="right">
                                        {!version.rootVersion && (
                                            <Button size="small" startIcon={<RestoreIcon/>} disabled={busy} onClick={() => onRestore(version.name)}>Restore</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </AccordionDetails>
        </Accordion>
    );
}
