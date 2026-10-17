import {useState} from 'react';
import {useLazyQuery} from '@apollo/client';
import {Box, Button, Chip, Link, Paper, Stack, TextField, Typography} from '@mui/material';
import {CheckCircle as OkIcon, Cancel as KoIcon, VerifiedUser as PermissionIcon} from '@mui/icons-material';
import {NODE_PERMISSION} from '../graphql/queries';
import {formatDate} from '../../shared/format';

function Flag({label, value, testId}) {
    return <Chip size="small" variant="outlined" icon={value ? <OkIcon color="success"/> : <KoIcon color="error"/>} label={label} data-testid={testId}/>;
}

/** The Jahia level view of the node: what JCRNodeWrapperImpl and the Jahia services add to javax.jcr. */
export default function JahiaInfoPanel({node, sessionVars, onLanguageChange}) {
    const jahia = node.jahia;
    const [permission, setPermission] = useState('jcr:write');
    const [check, result] = useLazyQuery(NODE_PERMISSION, {fetchPolicy: 'network-only'});
    const granted = result.data?.admin?.superTools?.jcr?.node?.jahia?.hasPermission;

    if (!jahia) {
        return null;
    }
    return (
        <Paper sx={{p: 2, mb: 2}} data-testid="jcr-jahia-info">
            <Typography variant="h6" sx={{mb: 1}}>Jahia view</Typography>
            <Stack spacing={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 100}}>Displayable name</Typography>
                    <Typography variant="body2" data-testid="jcr-jahia-displayable-name">{jahia.displayableName}</Typography>
                    {jahia.siteKey && <Chip size="small" variant="outlined" label={`site ${jahia.siteKey}`}/>}
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 100}}>Checks</Typography>
                    <Flag label={jahia.hasVisibilityConditions ? 'visible (conditions met)' : 'visible (no condition)'} value={jahia.visible} testId="jcr-jahia-visible"/>
                    <Flag label={jahia.language ? `valid in ${jahia.language}` : 'valid'} value={jahia.valid} testId="jcr-jahia-valid"/>
                    {jahia.markedForDeletion && <Chip size="small" color="error" label="marked for deletion"/>}
                    {jahia.lastPublished ? <Chip size="small" variant="outlined" label={`last published ${formatDate(jahia.lastPublished)}`}/> : <Chip size="small" variant="outlined" label="never published"/>}
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 100}}>Translations</Typography>
                    {jahia.existingLocales.length === 0 && <Typography variant="body2" color="text.secondary">none</Typography>}
                    {jahia.existingLocales.map(locale => (
                        <Chip
                            key={locale}
                            size="small"
                            label={locale}
                            color={locale === jahia.language ? 'primary' : 'default'}
                            variant={locale === jahia.language ? 'filled' : 'outlined'}
                            data-testid={`jcr-jahia-locale-${locale}`}
                            onClick={() => onLanguageChange(locale)}
                        />
                    ))}
                    {jahia.existingLocales.length > 0 && <Typography variant="caption" color="text.secondary">click a locale to switch the session language</Typography>}
                </Stack>
                {(jahia.lockInfos.length > 0 || jahia.lockedLocales.length > 0) && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{minWidth: 100}}>Jahia locks</Typography>
                        {jahia.lockInfos.map(info => <Chip key={info} size="small" color="warning" variant="outlined" label={info}/>)}
                        {jahia.lockedLocales.map(locale => <Chip key={`locked-${locale}`} size="small" color="warning" label={`locked for you in ${locale}`}/>)}
                    </Stack>
                )}
                <Stack direction="row" spacing={1} alignItems="center" component="form" onSubmit={event => {
                    event.preventDefault();
                    check({variables: {...sessionVars, uuid: node.uuid, permission: permission.trim()}});
                }}
                >
                    <Typography variant="body2" color="text.secondary" sx={{minWidth: 100}}>Permission</Typography>
                    <TextField size="small" value={permission} placeholder="jcr:write" sx={{width: 220}} slotProps={{htmlInput: {'data-testid': 'jcr-jahia-permission'}}} onChange={event => setPermission(event.target.value)}/>
                    <Button type="submit" size="small" variant="outlined" startIcon={<PermissionIcon/>} disabled={!permission.trim() || result.loading} data-testid="jcr-jahia-permission-check">Check for the session user</Button>
                    {granted !== undefined && !result.loading && (
                        <Flag label={granted ? `${result.variables.permission} granted` : `${result.variables.permission} denied`} value={granted} testId="jcr-jahia-permission-result"/>
                    )}
                </Stack>
                <Box>
                    <Typography variant="caption" color="text.secondary">
                        Node types as Jahia lists them: {jahia.nodeTypes ? jahia.nodeTypes.join(', ') : ''}
                        {' · '}<Link href="#" underline="hover" onClick={event => event.preventDefault()}>translation nodes are hidden and their properties merged for the session language</Link>
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
}
