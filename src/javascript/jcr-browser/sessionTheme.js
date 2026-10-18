/**
 * Visual identity of the two session kinds, so that a glance tells which repository view is on screen:
 * blue-grey for the bare javax.jcr session of the provider, teal for the Jahia JCRSessionWrapper.
 */
export const SESSION_THEMES = {
    RAW: {
        mode: 'RAW',
        label: 'Pure JCR',
        description: 'javax.jcr session of the default provider',
        main: '#546E7A',
        dark: '#37474F',
        light: '#ECEFF1',
        border: '#B0BEC5'
    },
    JAHIA: {
        mode: 'JAHIA',
        label: 'Jahia JCR',
        description: 'Jahia JCRSessionWrapper',
        main: '#00897B',
        dark: '#00695C',
        light: '#E0F2F1',
        border: '#80CBC4'
    }
};

export function sessionTheme(mode) {
    return SESSION_THEMES[mode] || SESSION_THEMES.RAW;
}

/**
 * Visual identity of the workspaces: blue for the default (edit) workspace, green for live, the convention of the
 * Jahia publication status.
 */
export const WORKSPACE_THEMES = {
    default: {
        workspace: 'default',
        label: 'default',
        description: 'default workspace: the edit (staging) content',
        main: '#1E88E5',
        dark: '#1565C0',
        light: '#E3F2FD',
        border: '#90CAF9'
    },
    live: {
        workspace: 'live',
        label: 'live',
        description: 'live workspace: the published content served to visitors',
        main: '#2E7D32',
        dark: '#1B5E20',
        light: '#E8F5E9',
        border: '#A5D6A7'
    }
};

export function workspaceTheme(workspace) {
    return WORKSPACE_THEMES[workspace] || WORKSPACE_THEMES.default;
}

/**
 * sx of a Paper that shows repository content: the left edge carries the session colour, the top edge the
 * workspace colour, so both contexts are readable on every panel.
 */
export function contextPaperSx(mode, workspace) {
    return {borderLeft: `6px solid ${sessionTheme(mode).main}`, borderTop: `4px solid ${workspaceTheme(workspace).main}`};
}

/** A small filled chip style in the given colours. */
export function badgeSx(colors) {
    return {bgcolor: colors.main, color: '#fff', fontWeight: 600, '& .MuiChip-icon': {color: '#fff'}};
}
