import {useEffect, useState} from 'react';
import {Box, Breadcrumbs, Chip, IconButton, InputAdornment, Link, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography} from '@mui/material';
import {AccountCircle as UserIcon, ContentCopy as CopyIcon, Edit as EditIcon, Home as HomeIcon, Search as SearchIcon, Settings as SystemIcon, Visibility as LiveIcon} from '@mui/icons-material';
import {copyToClipboard} from '../../shared/format';
import {displayName} from '../utils';
import {WORKSPACE_THEMES, badgeSx, sessionTheme, workspaceTheme} from '../sessionTheme';

export default function PathBar({state, session, node, onNavigateToPath, onNavigateToUuid, onWorkspaceChange, onCopied}) {
    const [mode, setMode] = useState('path');
    const [input, setInput] = useState('');

    useEffect(() => {
        if (node) {
            setInput(mode === 'path' ? node.path : node.uuid);
        }
    }, [node, mode]);

    const submit = () => {
        const value = input.trim();
        if (!value) {
            return;
        }
        if (mode === 'uuid') {
            onNavigateToUuid(value);
        } else {
            onNavigateToPath(value.startsWith('/') ? value : `/${value}`);
        }
    };

    const crumbs = node ? [...(node.ancestors || []).filter(ancestor => ancestor.path !== '/'), node] : [];
    const colors = workspaceTheme(state.workspace);
    const sessionColors = sessionTheme(state.mode);
    const toggleSx = workspace => ({
        '&.Mui-selected, &.Mui-selected:hover': {bgcolor: WORKSPACE_THEMES[workspace].main, color: '#fff', borderColor: WORKSPACE_THEMES[workspace].dark}
    });

    return (
        <Paper sx={{p: 1.5, mb: 2, bgcolor: colors.light, borderColor: colors.border, borderTop: `4px solid ${colors.main}`}} data-testid="jcr-path-bar" data-workspace={state.workspace}>
            <Stack direction={{xs: 'column', md: 'row'}} spacing={1.5} alignItems="center">
                <Stack spacing={0.75} alignItems="flex-start" sx={{flexShrink: 0}}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title={colors.description}>
                            <Chip size="small" icon={state.workspace === 'live' ? <LiveIcon/> : <EditIcon/>} label={`${colors.label} workspace`} sx={badgeSx(colors)} data-testid="jcr-workspace-badge"/>
                        </Tooltip>
                        <ToggleButtonGroup exclusive size="small" value={state.workspace} sx={{bgcolor: '#fff'}} onChange={(event, value) => value && onWorkspaceChange(value)}>
                            <ToggleButton value="default" sx={toggleSx('default')} data-testid="jcr-workspace-default"><EditIcon fontSize="small" sx={{mr: 0.5}}/>default</ToggleButton>
                            <ToggleButton value="live" sx={toggleSx('live')} data-testid="jcr-workspace-live"><LiveIcon fontSize="small" sx={{mr: 0.5}}/>live</ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    {session && (
                        <Tooltip title={session.system ? 'System session of the provider: no user, no access control' : (session.impersonated ? `Jahia session impersonating ${session.userId}` : `Jahia session of the connected user ${session.userId}`)}>
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={session.system ? <SystemIcon/> : <UserIcon/>}
                                label={session.system ? 'system session' : `user ${session.userId}`}
                                color={session.impersonated ? 'warning' : 'default'}
                                sx={session.impersonated ? {bgcolor: '#fff', fontWeight: 600} : {bgcolor: '#fff', borderColor: sessionColors.main, color: sessionColors.dark, '& .MuiChip-icon': {color: sessionColors.main}}}
                                data-testid="jcr-session-info"
                            />
                        </Tooltip>
                    )}
                </Stack>
                <ToggleButtonGroup exclusive size="small" value={mode} sx={{bgcolor: '#fff'}} onChange={(event, value) => value && setMode(value)}>
                    <ToggleButton value="path" data-testid="jcr-mode-path">Path</ToggleButton>
                    <ToggleButton value="uuid" data-testid="jcr-mode-uuid">UUID</ToggleButton>
                </ToggleButtonGroup>
                <TextField
                    fullWidth
                    size="small"
                    value={input}
                    placeholder={mode === 'path' ? '/sites/mysite/home' : 'cafebabe-cafe-babe-cafe-babecafebabe'}
                    slotProps={{
                        htmlInput: {'data-testid': 'jcr-path-input'},
                        input: {
                            sx: {fontFamily: 'monospace', bgcolor: '#fff'},
                            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment>,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Tooltip title="Copy">
                                        <IconButton size="small" onClick={() => copyToClipboard(input).then(onCopied)}><CopyIcon fontSize="small"/></IconButton>
                                    </Tooltip>
                                </InputAdornment>
                            )
                        }
                    }}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            submit();
                        }
                    }}
                />
            </Stack>
            <Box sx={{mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, minHeight: 24}}>
                <Breadcrumbs maxItems={12} sx={{flexGrow: 1}} data-testid="jcr-breadcrumb">
                    <Link component="button" underline="hover" color="inherit" sx={{display: 'flex', alignItems: 'center'}} onClick={() => onNavigateToPath('/')}>
                        <HomeIcon fontSize="small"/>
                    </Link>
                    {crumbs.map((crumb, index) => (
                        index === crumbs.length - 1 && crumb.uuid === node?.uuid ? (
                            <Typography key={crumb.uuid} color="text.primary" fontWeight={600} sx={{fontFamily: 'monospace'}}>{displayName(crumb)}</Typography>
                        ) : (
                            <Link key={crumb.uuid} component="button" underline="hover" sx={{fontFamily: 'monospace'}} onClick={() => onNavigateToUuid(crumb.uuid)}>{crumb.name}</Link>
                        )
                    ))}
                </Breadcrumbs>
            </Box>
        </Paper>
    );
}
