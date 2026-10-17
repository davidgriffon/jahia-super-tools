import {useEffect, useMemo} from 'react';
import {useQuery} from '@apollo/client';
import {SimpleTreeView} from '@mui/x-tree-view/SimpleTreeView';
import {TreeItem} from '@mui/x-tree-view/TreeItem';
import {Box, Button, CircularProgress, Typography} from '@mui/material';
import {
    Description as FileIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Lock as LockIcon,
    Storage as RootIcon
} from '@mui/icons-material';
import {NODE_CHILDREN} from '../graphql/queries';
import {errorMessage} from '../../shared/apollo';
import {displayName} from '../utils';

const PAGE = 100;

function TreeLabel({node, expanded}) {
    let icon = <FileIcon sx={{fontSize: 16, color: 'text.secondary'}}/>;
    if (node.depth === 0) {
        icon = <RootIcon sx={{fontSize: 16, color: 'primary.main'}}/>;
    } else if (node.hasChildren) {
        icon = expanded ? <FolderOpenIcon sx={{fontSize: 16, color: 'warning.main'}}/> : <FolderIcon sx={{fontSize: 16, color: 'warning.main'}}/>;
    }
    return (
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, py: 0.25}}>
            {icon}
            {node.locked && <LockIcon sx={{fontSize: 14, color: 'warning.dark'}}/>}
            <Typography variant="body2" noWrap sx={{flexShrink: 1}}>{displayName(node)}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{fontFamily: 'monospace', ml: 'auto', pl: 1}}>{node.primaryType}</Typography>
        </Box>
    );
}

/** One node of the tree. Children are only queried once the item is expanded, 100 at a time. */
function JcrTreeNode({node, sessionVars, expandedItems, refreshToken}) {
    const expanded = expandedItems.includes(node.uuid);
    const {data, loading, error, fetchMore, refetch} = useQuery(NODE_CHILDREN, {
        variables: {...sessionVars, uuid: node.uuid, offset: 0, limit: PAGE},
        skip: !expanded || !node.hasChildren,
        notifyOnNetworkStatusChange: true
    });

    useEffect(() => {
        if (expanded && node.hasChildren && refreshToken > 0) {
            refetch();
        }
        // Only re-run when the parent asks for a refresh.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshToken]);

    const connection = data?.admin?.superTools?.jcr?.node?.children;
    const children = useMemo(() => connection?.nodes || [], [connection]);
    const totalCount = connection?.totalCount || 0;

    const loadMore = () => fetchMore({
        variables: {offset: children.length},
        updateQuery: (previous, {fetchMoreResult}) => {
            if (!fetchMoreResult) {
                return previous;
            }
            const previousNode = previous.admin.superTools.jcr.node;
            const nextChildren = fetchMoreResult.admin.superTools.jcr.node.children;
            return {
                admin: {
                    ...previous.admin,
                    superTools: {
                        ...previous.admin.superTools,
                        jcr: {
                            ...previous.admin.superTools.jcr,
                            node: {...previousNode, children: {...nextChildren, nodes: [...previousNode.children.nodes, ...nextChildren.nodes]}}
                        }
                    }
                }
            };
        }
    });

    return (
        <TreeItem itemId={node.uuid} label={<TreeLabel node={node} expanded={expanded}/>}>
            {node.hasChildren && !data && (
                <TreeItem itemId={`${node.uuid}-placeholder`} label={<Typography variant="caption" color="text.secondary">{loading ? 'Loading...' : error ? errorMessage(error) : '...'}</Typography>}/>
            )}
            {children.map(child => (
                <JcrTreeNode key={child.uuid} node={child} sessionVars={sessionVars} expandedItems={expandedItems} refreshToken={refreshToken}/>
            ))}
            {data && children.length < totalCount && (
                <TreeItem
                    itemId={`${node.uuid}-more`}
                    label={
                        <Button size="small" disabled={loading} startIcon={loading ? <CircularProgress size={12}/> : null} onClick={event => {
                            event.stopPropagation();
                            loadMore();
                        }}
                        >
                            Load more ({children.length} / {totalCount})
                        </Button>
                    }
                />
            )}
        </TreeItem>
    );
}

export default function JcrTree({root, sessionVars, selectedUuid, expandedItems, onExpandedItemsChange, onSelect, refreshToken}) {
    if (!root) {
        return <Box sx={{p: 2, display: 'flex', justifyContent: 'center'}}><CircularProgress size={20}/></Box>;
    }
    return (
        <SimpleTreeView
            data-testid="jcr-tree"
            expandedItems={expandedItems}
            selectedItems={selectedUuid || null}
            expansionTrigger="iconContainer"
            sx={{
                '& .MuiTreeItem-content': {py: 0, borderRadius: 1},
                '& .MuiTreeItem-content.Mui-selected': {bgcolor: 'rgba(0, 114, 177, 0.14)'},
                '& .MuiTreeItem-content.Mui-selected.Mui-focused': {bgcolor: 'rgba(0, 114, 177, 0.2)'}
            }}
            onExpandedItemsChange={(event, itemIds) => onExpandedItemsChange(itemIds.filter(id => !id.endsWith('-placeholder') && !id.endsWith('-more')))}
            onSelectedItemsChange={(event, itemId) => {
                if (itemId && !itemId.endsWith('-placeholder') && !itemId.endsWith('-more')) {
                    onSelect(itemId);
                }
            }}
        >
            <JcrTreeNode node={root} sessionVars={sessionVars} expandedItems={expandedItems} refreshToken={refreshToken}/>
        </SimpleTreeView>
    );
}
