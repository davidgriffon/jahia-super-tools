import {useCallback, useEffect, useMemo, useState} from 'react';
import {useApolloClient, useQuery} from '@apollo/client';
import {Alert, AlertTitle, Box, CircularProgress, Paper, Typography} from '@mui/material';
import {NODE_BY_ID, NODE_BY_PATH} from '../graphql/queries';
import {
    ADD_MIXIN,
    ADD_NODE,
    CHECKIN_NODE,
    CHECKOUT_NODE,
    LOCK_NODE,
    MOVE_NODE,
    REMOVE_MIXIN,
    REMOVE_NODE,
    REMOVE_PROPERTY,
    RENAME_NODE,
    RESTORE_VERSION,
    SET_PROPERTY,
    UNLOCK_NODE
} from '../graphql/mutations';
import {useHashState} from '../hooks/useHashState';
import {isSensitivePath} from '../utils';
import {errorMessage} from '../../shared/apollo';
import ConfirmDialog from '../../shared/ConfirmDialog';
import {useNotification} from '../../shared/useNotification';
import JcrTree from './JcrTree';
import PathBar from './PathBar';
import NodeHeader from './NodeHeader';
import ActionsBar from './ActionsBar';
import PropertiesPanel from './PropertiesPanel';
import PropertyEditorDialog from './PropertyEditorDialog';
import ReferencesPanel from './ReferencesPanel';
import VersionsPanel from './VersionsPanel';
import SessionBar from './SessionBar';
import JahiaInfoPanel from './JahiaInfoPanel';

export default function JcrBrowserApp({contextPath}) {
    const client = useApolloClient();
    const {state, navigateToUuid, navigateToPath, setWorkspace, setMode, setLanguage, setUser} = useHashState();
    const {notify, notification} = useNotification();
    const [expandedItems, setExpandedItems] = useState([]);
    const [refreshToken, setRefreshToken] = useState(0);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [editor, setEditor] = useState({open: false, property: null});

    /** Session arguments of every GraphQL document: workspace, mode, language and impersonated user. */
    const sessionVars = useMemo(() => ({workspace: state.workspace, mode: state.mode, language: state.language, user: state.user}), [state.workspace, state.mode, state.language, state.user]);

    // The tree always starts at the root node of the workspace.
    const rootQuery = useQuery(NODE_BY_PATH, {variables: {...sessionVars, path: '/'}});
    const rootNode = rootQuery.data?.admin?.superTools?.jcr?.node;

    const byId = useQuery(NODE_BY_ID, {variables: {...sessionVars, uuid: state.uuid || ''}, skip: !state.uuid});
    const byPath = useQuery(NODE_BY_PATH, {variables: {...sessionVars, path: state.path || '/'}, skip: Boolean(state.uuid)});
    const query = state.uuid ? byId : byPath;
    const node = query.data?.admin?.superTools?.jcr?.node;

    // Keep the tree in sync with the selected node: expand its ancestors.
    useEffect(() => {
        if (node) {
            setExpandedItems(previous => {
                const next = new Set(previous);
                (node.ancestors || []).forEach(ancestor => next.add(ancestor.uuid));
                if (node.hasChildren) {
                    next.add(node.uuid);
                }
                return [...next];
            });
        }
    }, [node]);

    useEffect(() => {
        if (rootNode) {
            setExpandedItems(previous => (previous.includes(rootNode.uuid) ? previous : [rootNode.uuid, ...previous]));
        }
    }, [rootNode]);

    const refresh = useCallback(() => {
        query.refetch();
        setRefreshToken(token => token + 1);
    }, [query]);

    /** Runs a mutation on the current node, reports the outcome and refreshes the view. */
    const execute = useCallback(async (mutation, variables, successMessage, after) => {
        setBusy(true);
        try {
            const result = await client.mutate({mutation, variables: {...sessionVars, ...variables}});
            if (result.errors && result.errors.length > 0) {
                notify('error', errorMessage(result.errors));
                return false;
            }
            notify('success', successMessage);
            if (after) {
                after(result.data?.admin?.superTools?.jcr?.mutateNode);
            }
            refresh();
            return true;
        } catch (error) {
            notify('error', errorMessage(error));
            return false;
        } finally {
            setBusy(false);
        }
    }, [client, sessionVars, notify, refresh]);

    const askConfirmation = (title, message, action, confirmLabel = 'Confirm') => setConfirm({title, message, action, confirmLabel});

    /** Writes under users, groups, roles, permissions, settings or ACLs are acknowledged explicitly first (the server refuses them otherwise). */
    const run = useCallback((mutation, variables, successMessage, after) => {
        if (node && isSensitivePath(node.path)) {
            return new Promise(resolve => setConfirm({
                title: 'Sensitive subtree',
                message: `${node.path} belongs to users, groups, roles, permissions, settings or ACLs. Apply the change anyway? It is recorded in the server log.`,
                confirmLabel: 'Apply',
                action: () => resolve(execute(mutation, {...variables, acknowledgeSensitive: true}, successMessage, after))
            }));
        }
        return execute(mutation, variables, successMessage, after);
    }, [node, execute]);

    const handleSaveProperty = async ({name, type, multiple, values}) => {
        setEditor({open: false, property: null});
        if (!node) {
            return;
        }
        const variables = multiple ? {uuid: node.uuid, name, type, values} : {uuid: node.uuid, name, type, value: values[0] ?? ''};
        await run(SET_PROPERTY, variables, `Property ${name} saved`);
    };

    const parentUuid = useMemo(() => (node?.parent ? node.parent.uuid : rootNode?.uuid), [node, rootNode]);

    return (
        <Box>
            <SessionBar state={state} sessionVars={sessionVars} onModeChange={setMode} onLanguageChange={setLanguage} onUserChange={setUser}/>
            <PathBar
                state={state}
                node={node}
                onNavigateToPath={navigateToPath}
                onNavigateToUuid={navigateToUuid}
                onWorkspaceChange={setWorkspace}
                onCopied={() => notify('success', 'Copied to clipboard')}
            />
            <Box sx={{display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: {xs: 'column', lg: 'row'}}}>
                <Paper sx={{width: {xs: '100%', lg: 380}, flexShrink: 0, p: 1, maxHeight: 'calc(100vh - 220px)', overflow: 'auto', position: {lg: 'sticky'}, top: 8}}>
                    {rootQuery.error && <Alert severity="error">{errorMessage(rootQuery.error)}</Alert>}
                    <JcrTree
                        root={rootNode}
                        sessionVars={sessionVars}
                        selectedUuid={node?.uuid}
                        expandedItems={expandedItems}
                        refreshToken={refreshToken}
                        onExpandedItemsChange={setExpandedItems}
                        onSelect={navigateToUuid}
                    />
                </Paper>
                <Box sx={{flexGrow: 1, minWidth: 0}}>
                    {query.loading && !node && <Box sx={{display: 'flex', justifyContent: 'center', py: 6}}><CircularProgress/></Box>}
                    {query.error && (
                        <Alert severity="error" sx={{mb: 2}} data-testid="jcr-error">
                            <AlertTitle>Cannot load node</AlertTitle>
                            {errorMessage(query.error)}
                            <Typography variant="body2" sx={{mt: 1}}>
                                {state.uuid ? `identifier ${state.uuid}` : `path ${state.path}`} in workspace {state.workspace} ({state.mode === 'JAHIA' ? `Jahia session${state.user ? ` as ${state.user}` : ''}${state.language ? `, ${state.language}` : ''}` : 'pure JCR session'})
                            </Typography>
                        </Alert>
                    )}
                    {node && (
                        <>
                            <NodeHeader
                                node={node}
                                workspace={state.workspace}
                                onCopied={() => notify('success', 'Copied to clipboard')}
                                onRemoveMixin={mixin => askConfirmation('Remove mixin (Node.removeMixin)', `Remove mixin ${mixin} from ${node.path}? Properties and child nodes declared by this mixin will be lost.`,
                                    () => run(REMOVE_MIXIN, {uuid: node.uuid, mixin}, `Mixin ${mixin} removed`), 'Remove')}
                            />
                            <ActionsBar
                                node={node}
                                workspace={state.workspace}
                                sessionVars={sessionVars}
                                contextPath={contextPath}
                                busy={busy || query.loading}
                                onRefresh={refresh}
                                onLock={deep => run(LOCK_NODE, {uuid: node.uuid, deep}, 'Node locked')}
                                onUnlock={() => run(UNLOCK_NODE, {uuid: node.uuid}, 'Node unlocked')}
                                onCheckin={() => run(CHECKIN_NODE, {uuid: node.uuid}, 'Node checked in', result => result?.checkin && notify('success', `Version ${result.checkin} created`))}
                                onCheckout={() => run(CHECKOUT_NODE, {uuid: node.uuid}, 'Node checked out')}
                                // The path in the URL is stale after a rename or a move: follow the node by its identifier instead.
                                onRename={name => run(RENAME_NODE, {uuid: node.uuid, name}, `Node renamed to ${name}`, () => navigateToUuid(node.uuid))}
                                onMove={destinationPath => run(MOVE_NODE, {uuid: node.uuid, destinationPath}, `Node moved to ${destinationPath}`, () => navigateToUuid(node.uuid))}
                                onDelete={() => askConfirmation('Remove node (Node.remove)', `Remove ${node.path} and all its descendants from the ${state.workspace} workspace? This cannot be undone.`,
                                    () => run(REMOVE_NODE, {uuid: node.uuid}, 'Node removed', () => (parentUuid ? navigateToUuid(parentUuid) : navigateToPath('/'))), 'Remove')}
                                onAddMixin={mixin => run(ADD_MIXIN, {uuid: node.uuid, mixin}, `Mixin ${mixin} added`)}
                                onAddNode={({name, type}) => run(ADD_NODE, {uuid: node.uuid, name, primaryType: type}, `Node ${name} added`, result => result?.addNode && navigateToUuid(result.addNode.uuid))}
                                onAddProperty={() => setEditor({open: true, property: null})}
                            />
                            {node.jahia && <JahiaInfoPanel node={node} sessionVars={sessionVars} onLanguageChange={setLanguage}/>}
                            <PropertiesPanel
                                properties={node.properties || []}
                                locked={node.locked}
                                onEdit={property => setEditor({open: true, property})}
                                onNavigate={navigateToUuid}
                                onRemove={property => askConfirmation('Remove property (Property.remove)', `Remove property ${property.name} from ${node.path}?`,
                                    () => run(REMOVE_PROPERTY, {uuid: node.uuid, name: property.name}, `Property ${property.name} removed`), 'Remove')}
                            />
                            <ReferencesPanel key={`refs-${node.uuid}-${state.workspace}-${state.mode}-${refreshToken}`} uuid={node.uuid} sessionVars={sessionVars} count={node.referencesCount} onNavigate={navigateToUuid}/>
                            {node.versionable && (
                                <VersionsPanel
                                    key={`versions-${node.uuid}-${state.workspace}-${state.mode}`}
                                    uuid={node.uuid}
                                    sessionVars={sessionVars}
                                    baseVersion={node.baseVersion}
                                    busy={busy}
                                    onRestore={versionName => askConfirmation('Restore version (VersionManager.restore)', `Restore ${node.path} to version ${versionName}? The current state is kept as a version only if the node is checked in.`,
                                        () => run(RESTORE_VERSION, {uuid: node.uuid, versionName, removeExisting: false}, `Version ${versionName} restored`), 'Restore')}
                                />
                            )}
                        </>
                    )}
                </Box>
            </Box>

            <PropertyEditorDialog
                open={editor.open}
                property={editor.property}
                onSave={handleSaveProperty}
                onCancel={() => setEditor({open: false, property: null})}
            />
            <ConfirmDialog
                open={Boolean(confirm)}
                title={confirm?.title || ''}
                message={confirm?.message || ''}
                confirmLabel={confirm?.confirmLabel}
                color="error"
                onCancel={() => setConfirm(null)}
                onConfirm={() => {
                    const action = confirm?.action;
                    setConfirm(null);
                    if (action) {
                        action();
                    }
                }}
            />
            {notification}
        </Box>
    );
}
