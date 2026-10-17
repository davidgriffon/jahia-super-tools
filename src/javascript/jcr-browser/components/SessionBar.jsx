import {useEffect, useState} from 'react';
import {useQuery} from '@apollo/client';
import {Alert, Chip, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography} from '@mui/material';
import {AccountCircle as UserIcon, Close as ClearIcon, Storage as RawIcon, Translate as LanguageIcon, Widgets as JahiaIcon} from '@mui/icons-material';
import {SESSION_INFO} from '../graphql/queries';
import {errorMessage} from '../../shared/apollo';

/**
 * Chooses the session the browser works on: the raw javax.jcr session of the default provider, or a Jahia
 * JCRSessionWrapper with an optional locale and an optional impersonated user.
 */
export default function SessionBar({state, sessionVars, onModeChange, onLanguageChange, onUserChange}) {
    const [userInput, setUserInput] = useState(state.user || '');
    const info = useQuery(SESSION_INFO, {variables: sessionVars});
    const session = info.data?.admin?.superTools?.jcr?.session;
    const languages = info.data?.admin?.superTools?.jcr?.languages || [];

    useEffect(() => setUserInput(state.user || ''), [state.user]);

    const isJahia = state.mode === 'JAHIA';

    return (
        <Paper sx={{p: 1.5, mb: 2}} data-testid="jcr-session-bar">
            <Stack direction={{xs: 'column', md: 'row'}} spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">Session</Typography>
                <ToggleButtonGroup exclusive size="small" color="primary" value={state.mode} onChange={(event, value) => value && onModeChange(value)}>
                    <Tooltip title="javax.jcr session of the default provider (system session): translation nodes, protected properties and system nodes as the repository holds them">
                        <ToggleButton value="RAW" data-testid="jcr-session-RAW"><RawIcon fontSize="small" sx={{mr: 0.5}}/>Pure JCR</ToggleButton>
                    </Tooltip>
                    <Tooltip title="Jahia JCRSessionWrapper (JCRNodeWrapperImpl): internationalized properties resolved for a language, visibility and validity checks, permissions of a user">
                        <ToggleButton value="JAHIA" data-testid="jcr-session-JAHIA"><JahiaIcon fontSize="small" sx={{mr: 0.5}}/>Jahia JCR</ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
                {isJahia && (
                    <>
                        <FormControl size="small" sx={{minWidth: 150}}>
                            <InputLabel>Language</InputLabel>
                            <Select
                                displayEmpty
                                value={state.language || ''}
                                label="Language"
                                data-testid="jcr-session-language"
                                startAdornment={<InputAdornment position="start"><LanguageIcon fontSize="small"/></InputAdornment>}
                                onChange={event => onLanguageChange(event.target.value || null)}
                            >
                                <MenuItem value=""><em>no locale</em></MenuItem>
                                {[...new Set([...languages, ...(state.language ? [state.language] : [])])].map(language => <MenuItem key={language} value={language}>{language}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField
                            size="small"
                            label="Impersonate user"
                            placeholder="user name, Enter to apply"
                            value={userInput}
                            sx={{minWidth: 220}}
                            slotProps={{
                                htmlInput: {'data-testid': 'jcr-session-user'},
                                input: {
                                    startAdornment: <InputAdornment position="start"><UserIcon fontSize="small"/></InputAdornment>,
                                    endAdornment: state.user ? (
                                        <InputAdornment position="end">
                                            <Tooltip title="Back to the connected user">
                                                <IconButton size="small" data-testid="jcr-session-user-clear" onClick={() => onUserChange(null)}><ClearIcon fontSize="small"/></IconButton>
                                            </Tooltip>
                                        </InputAdornment>
                                    ) : null
                                }
                            }}
                            onChange={event => setUserInput(event.target.value)}
                            onBlur={() => onUserChange(userInput.trim() || null)}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    onUserChange(userInput.trim() || null);
                                }
                            }}
                        />
                    </>
                )}
                {session && (
                    <Stack direction="row" spacing={0.5} sx={{ml: 'auto'}} data-testid="jcr-session-info">
                        <Chip size="small" variant="outlined" label={session.system ? 'system session' : `user ${session.userId}`} color={session.impersonated ? 'warning' : 'default'}/>
                        {session.language && <Chip size="small" variant="outlined" label={`locale ${session.language}`}/>}
                        <Chip size="small" variant="outlined" label={session.workspace}/>
                    </Stack>
                )}
            </Stack>
            {info.error && <Alert severity="error" sx={{mt: 1}} data-testid="jcr-session-error">{errorMessage(info.error)}</Alert>}
        </Paper>
    );
}
