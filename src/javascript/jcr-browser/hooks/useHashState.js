import {useCallback, useEffect, useState} from 'react';

export const WORKSPACES = ['default', 'live'];
export const MODES = ['RAW', 'JAHIA'];

/**
 * Browser state lives in the URL fragment (#workspace=default&mode=JAHIA&language=en&user=bob&uuid=...) rather than in the query string:
 * the Support Tools CSRF filter rejects query strings without a fresh toolAccessToken, while the fragment is never
 * sent to the server. The fragment also makes a view bookmarkable. Without uuid nor path the root node is shown.
 */
function parseHash() {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const path = params.get('path');
    const uuid = params.get('uuid');
    const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'RAW';
    return {
        workspace: WORKSPACES.includes(params.get('workspace')) ? params.get('workspace') : 'default',
        mode,
        language: mode === 'JAHIA' ? (params.get('language') || null) : null,
        user: mode === 'JAHIA' ? (params.get('user') || null) : null,
        path: path || (uuid ? null : '/'),
        uuid: path ? null : uuid
    };
}

function serialize(state) {
    const params = new URLSearchParams();
    params.set('workspace', state.workspace);
    if (state.mode === 'JAHIA') {
        params.set('mode', 'JAHIA');
        if (state.language) {
            params.set('language', state.language);
        }
        if (state.user) {
            params.set('user', state.user);
        }
    }
    if (state.uuid) {
        params.set('uuid', state.uuid);
    } else if (state.path && state.path !== '/') {
        params.set('path', state.path);
    }
    return params.toString();
}

export function useHashState() {
    const [state, setState] = useState(parseHash);

    useEffect(() => {
        const onHashChange = () => setState(parseHash());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const update = useCallback(changes => {
        setState(previous => {
            const next = {...previous, ...changes};
            const serialized = serialize(next);
            if (serialized !== window.location.hash.replace(/^#/, '')) {
                window.history.pushState(null, '', `#${serialized}`);
            }
            return next;
        });
    }, []);

    const navigateToUuid = useCallback(uuid => update({uuid, path: null}), [update]);
    const navigateToPath = useCallback(path => update({path: path || '/', uuid: null}), [update]);
    const setWorkspace = useCallback(workspace => update({workspace}), [update]);
    const setMode = useCallback(mode => update(mode === 'JAHIA' ? {mode} : {mode: 'RAW', language: null, user: null}), [update]);
    const setLanguage = useCallback(language => update({language: language || null}), [update]);
    const setUser = useCallback(user => update({user: user || null}), [update]);

    return {state, navigateToUuid, navigateToPath, setWorkspace, setMode, setLanguage, setUser};
}
