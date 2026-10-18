import {Box, Chip, IconButton, Paper, Stack, Tooltip, Typography} from '@mui/material';
import {ContentCopy as CopyIcon, History as VersionIcon, Lock as LockIcon} from '@mui/icons-material';
import {copyToClipboard} from '../../shared/format';
import {displayName} from '../utils';
import {badgeSx, contextPaperSx, sessionTheme, workspaceTheme} from '../sessionTheme';

function Field({label, children}) {
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexWrap: 'wrap'}}>
            <Typography variant="body2" color="text.secondary" sx={{minWidth: 100}}>{label}</Typography>
            {children}
        </Box>
    );
}

export default function NodeHeader({mode, node, workspace, onCopied, onRemoveMixin}) {
    const lock = node.lock;
    const definition = node.definition;

    return (
        <Paper sx={{p: 2, mb: 2, ...contextPaperSx(mode, workspace)}} data-testid="jcr-node-header">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{mb: 1}}>
                <Tooltip title={sessionTheme(mode).description}>
                    <Chip size="small" label={sessionTheme(mode).label} sx={badgeSx(sessionTheme(mode))} data-testid="jcr-node-session"/>
                </Tooltip>
                <Tooltip title={workspaceTheme(workspace).description}>
                    <Chip size="small" label={workspaceTheme(workspace).label} sx={badgeSx(workspaceTheme(workspace))} data-testid="jcr-node-workspace"/>
                </Tooltip>
                <Typography variant="h5" sx={{fontFamily: 'monospace'}} data-testid="jcr-node-name">{displayName(node)}</Typography>
                <Chip label={`${workspace} workspace`} size="small" color={workspace === 'default' ? 'primary' : 'success'} variant="outlined"/>
                {node.locked && (
                    <Tooltip title={lock ? `${lock.deep ? 'deep' : 'shallow'} ${lock.sessionScoped ? 'session-scoped' : 'open-scoped'} lock on ${lock.nodePath}` : 'locked'}>
                        <Chip icon={<LockIcon/>} label={`Locked by ${lock?.owner || 'unknown'}`} size="small" color="warning" data-testid="jcr-node-lock"/>
                    </Tooltip>
                )}
                {node.versionable && (
                    <Tooltip title={`base version ${node.baseVersion || '?'}`}>
                        <Chip icon={<VersionIcon/>} label={node.checkedOut ? 'checked out' : 'checked in'} size="small" color={node.checkedOut ? 'default' : 'info'} variant="outlined" data-testid="jcr-node-version-state"/>
                    </Tooltip>
                )}
                <Chip label={`${node.childrenCount} child${node.childrenCount === 1 ? '' : 'ren'}`} size="small" variant="outlined" sx={{ml: 'auto'}}/>
                <Chip label={`${node.referencesCount} reference${node.referencesCount === 1 ? '' : 's'}`} size="small" variant="outlined"/>
            </Stack>
            <Stack spacing={0.5}>
                <Field label="Path">
                    <Typography variant="body2" sx={{fontFamily: 'monospace', wordBreak: 'break-all'}} data-testid="jcr-node-path">{node.path}</Typography>
                    <Tooltip title="Copy path"><IconButton size="small" onClick={() => copyToClipboard(node.path).then(onCopied)}><CopyIcon sx={{fontSize: 14}}/></IconButton></Tooltip>
                </Field>
                <Field label="Identifier">
                    <Typography variant="body2" sx={{fontFamily: 'monospace'}} data-testid="jcr-node-uuid">{node.uuid}</Typography>
                    <Tooltip title="Copy identifier"><IconButton size="small" onClick={() => copyToClipboard(node.uuid).then(onCopied)}><CopyIcon sx={{fontSize: 14}}/></IconButton></Tooltip>
                    <Typography variant="caption" color="text.secondary">depth {node.depth}{node.index > 1 ? `, index ${node.index}` : ''}</Typography>
                </Field>
                <Field label="Primary type">
                    <Tooltip title={`Supertypes: ${(node.supertypes || []).join(', ') || 'none'}`}>
                        <Chip label={node.primaryType} size="small" color="primary" data-testid="jcr-node-type"/>
                    </Tooltip>
                    {node.hasOrderableChildNodes && <Typography variant="caption" color="text.secondary">orderable children</Typography>}
                </Field>
                <Field label="Mixins">
                    {node.mixins?.length ? (
                        <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}} data-testid="jcr-node-mixins">
                            {node.mixins.map(mixin => (
                                <Chip key={mixin} label={mixin} size="small" color="info" variant="outlined" onDelete={onRemoveMixin ? () => onRemoveMixin(mixin) : undefined}/>
                            ))}
                        </Box>
                    ) : <Typography variant="body2" color="text.secondary">none</Typography>}
                </Field>
                {definition && node.depth > 0 && (
                    <Field label="Definition">
                        <Typography variant="body2" sx={{fontFamily: 'monospace'}} data-testid="jcr-node-definition">
                            {definition.declaringNodeType}.{definition.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {[definition.protected && 'protected', definition.mandatory && 'mandatory', definition.autoCreated && 'autocreated',
                                definition.allowsSameNameSiblings && 'same-name siblings'].filter(Boolean).join(', ') || 'no constraint'}
                            {definition.requiredPrimaryTypes?.length ? ` · requires ${definition.requiredPrimaryTypes.join(', ')}` : ''}
                        </Typography>
                    </Field>
                )}
            </Stack>
        </Paper>
    );
}
