import {useEffect, useState} from 'react';
import {Alert, Chip, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip} from '@mui/material';
import {AccountCircle as UserIcon, Close as ClearIcon, Storage as RawIcon, Translate as LanguageIcon, Widgets as JahiaIcon} from '@mui/icons-material';
import {errorMessage} from '../../shared/apollo';
import {SESSION_THEMES, sessionTheme} from '../sessionTheme';

/**
 * Chooses the session the browser works on: the raw javax.jcr session of the default provider, or a Jahia
 * JCRSessionWrapper with an optional locale and an optional impersonated user.
 */
export default function SessionBar({state, session, languages, error, onModeChange, onLanguageChange, onUserChange}) {
    const [userInput, setUserInput] = useState(state.user || '');

    useEffect(() => setUserInput(state.user || ''), [state.user]);

    const isJahia = state.mode === 'JAHIA';
    const colors = sessionTheme(state.mode);
    // A selected toggle takes the colour of the session it stands for, so the two choices never look alike.
    const toggleSx = mode => ({
        '&.Mui-selected, &.Mui-selected:hover': {bgcolor: SESSION_THEMES[mode].main, color: '#fff', borderColor: SESSION_THEMES[mode].dark}
    });

    return (
        <Paper sx={{p: 1.5, mb: 2, bgcolor: colors.light, borderColor: colors.border, borderLeft: `6px solid ${colors.main}`}} data-testid="jcr-session-bar" data-session-mode={state.mode}>
            <Stack direction={{xs: 'column', md: 'row'}} spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                    size="small"
                    icon={isJahia ? <JahiaIcon/> : <RawIcon/>}
                    label={`${colors.label} session`}
                    sx={{bgcolor: colors.main, color: '#fff', fontWeight: 600, '& .MuiChip-icon': {color: '#fff'}}}
                    data-testid="jcr-session-badge"
                />
                <ToggleButtonGroup exclusive size="small" value={state.mode} sx={{bgcolor: '#fff'}} onChange={(event, value) => value && onModeChange(value)}>
                    <Tooltip title="javax.jcr session of the default provider (system session): translation nodes, protected properties and system nodes as the repository holds them">
                        <ToggleButton value="RAW" sx={toggleSx('RAW')} data-testid="jcr-session-RAW"><RawIcon fontSize="small" sx={{mr: 0.5}}/>Pure JCR</ToggleButton>
                    </Tooltip>
                    <Tooltip title="Jahia JCRSessionWrapper (JCRNodeWrapperImpl): internationalized properties resolved for a language, visibility and validity checks, permissions of a user">
                        <ToggleButton value="JAHIA" sx={toggleSx('JAHIA')} data-testid="jcr-session-JAHIA"><JahiaIcon fontSize="small" sx={{mr: 0.5}}/>Jahia JCR</ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
                {isJahia && (
                    <>
                        <FormControl size="small" sx={{minWidth: 150, bgcolor: '#fff'}}>
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
                            sx={{minWidth: 220, bgcolor: '#fff'}}
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
                {session?.language && (
                    <Chip size="small" variant="outlined" label={`locale ${session.language}`} sx={{ml: 'auto', bgcolor: '#fff', borderColor: colors.main, color: colors.dark}} data-testid="jcr-session-locale"/>
                )}
            </Stack>
            {error && <Alert severity="error" sx={{mt: 1}} data-testid="jcr-session-error">{errorMessage(error)}</Alert>}
        </Paper>
    );
}
