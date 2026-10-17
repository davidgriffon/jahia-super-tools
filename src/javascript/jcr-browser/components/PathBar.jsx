import {useEffect, useState} from 'react';
import {Box, Breadcrumbs, IconButton, InputAdornment, Link, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography} from '@mui/material';
import {ContentCopy as CopyIcon, Edit as EditIcon, Home as HomeIcon, Search as SearchIcon, Visibility as LiveIcon} from '@mui/icons-material';
import {copyToClipboard} from '../../shared/format';
import {displayName} from '../utils';

export default function PathBar({state, node, onNavigateToPath, onNavigateToUuid, onWorkspaceChange, onCopied}) {
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

    return (
        <Paper sx={{p: 1.5, mb: 2}}>
            <Stack direction={{xs: 'column', md: 'row'}} spacing={1.5} alignItems="center">
                <ToggleButtonGroup exclusive size="small" color="primary" value={state.workspace} onChange={(event, value) => value && onWorkspaceChange(value)}>
                    <ToggleButton value="default" data-testid="jcr-workspace-default"><EditIcon fontSize="small" sx={{mr: 0.5}}/>default</ToggleButton>
                    <ToggleButton value="live" data-testid="jcr-workspace-live"><LiveIcon fontSize="small" sx={{mr: 0.5}}/>live</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup exclusive size="small" value={mode} onChange={(event, value) => value && setMode(value)}>
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
                            sx: {fontFamily: 'monospace'},
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
