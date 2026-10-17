/*
 * Copyright (C) 2002-2025 Jahia Solutions Group SA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jahia.community.supertools.gql.jcr;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.services.content.JCRNodeWrapper;

import javax.jcr.Node;
import javax.jcr.NodeIterator;
import javax.jcr.PathNotFoundException;
import javax.jcr.Property;
import javax.jcr.PropertyIterator;
import javax.jcr.RepositoryException;
import javax.jcr.UnsupportedRepositoryOperationException;
import javax.jcr.lock.LockException;
import javax.jcr.nodetype.NodeType;
import javax.jcr.version.Version;
import javax.jcr.version.VersionHistory;
import javax.jcr.version.VersionIterator;
import javax.jcr.version.VersionManager;
import java.util.ArrayList;
import java.util.List;

@GraphQLName("SuperToolsJcrNode")
@GraphQLDescription("A javax.jcr.Node of the raw repository session")
public class GqlJcrNode {

    private static final int DEFAULT_LIMIT = 100;
    private static final int MAX_LIMIT = 1000;

    private final Node node;

    public GqlJcrNode(Node node) {
        this.node = node;
    }

    Node getNode() {
        return node;
    }

    @GraphQLField
    @GraphQLDescription("Node identifier (uuid)")
    public String getUuid() throws RepositoryException {
        return node.getIdentifier();
    }

    @GraphQLField
    public String getName() throws RepositoryException {
        return node.getName();
    }

    @GraphQLField
    public String getPath() throws RepositoryException {
        return node.getPath();
    }

    @GraphQLField
    public int getDepth() throws RepositoryException {
        return node.getDepth();
    }

    @GraphQLField
    @GraphQLDescription("Same-name sibling index, 1 for the first")
    public int getIndex() throws RepositoryException {
        return node.getIndex();
    }

    @GraphQLField
    public String getPrimaryType() throws RepositoryException {
        return node.getPrimaryNodeType().getName();
    }

    @GraphQLField
    public List<String> getMixins() throws RepositoryException {
        List<String> names = new ArrayList<>();
        for (NodeType mixin : node.getMixinNodeTypes()) {
            names.add(mixin.getName());
        }
        return names;
    }

    @GraphQLField
    @GraphQLDescription("javax.jcr.Node#isNodeType")
    public boolean isNodeType(@GraphQLName("type") @GraphQLNonNull String type) throws RepositoryException {
        return node.isNodeType(type);
    }

    @GraphQLField
    @GraphQLDescription("Supertypes of the primary type")
    public List<String> getSupertypes() throws RepositoryException {
        List<String> names = new ArrayList<>();
        for (NodeType supertype : node.getPrimaryNodeType().getSupertypes()) {
            names.add(supertype.getName());
        }
        return names;
    }

    @GraphQLField
    public boolean isHasOrderableChildNodes() throws RepositoryException {
        return node.getPrimaryNodeType().hasOrderableChildNodes();
    }

    @GraphQLField
    @GraphQLDescription("All properties, protected ones included, in repository order")
    public List<GqlJcrProperty> getProperties() throws RepositoryException {
        List<GqlJcrProperty> properties = new ArrayList<>();
        PropertyIterator iterator = node.getProperties();
        while (iterator.hasNext()) {
            properties.add(new GqlJcrProperty(iterator.nextProperty()));
        }
        return properties;
    }

    @GraphQLField
    @GraphQLDescription("One property, null when absent")
    public GqlJcrProperty getProperty(@GraphQLName("name") @GraphQLNonNull String name) throws RepositoryException {
        try {
            return node.hasProperty(name) ? new GqlJcrProperty(node.getProperty(name)) : null;
        } catch (RepositoryException e) {
            // an unregistered namespace prefix or an invalid name is simply "no such property"
            return null;
        }
    }

    @GraphQLField
    @GraphQLDescription("Child nodes in repository order, translation and system nodes included")
    public GqlJcrNodeConnection getChildren(
            @GraphQLName("offset") @GraphQLDescription("Number of children to skip") Integer offset,
            @GraphQLName("limit") @GraphQLDescription("Maximum number of children, 100 by default, 1000 at most") Integer limit) throws RepositoryException {
        int skip = offset == null || offset < 0 ? 0 : offset;
        int size = limit == null || limit < 1 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        NodeIterator iterator = node.getNodes();
        long total = iterator.getSize();
        List<GqlJcrNode> nodes = new ArrayList<>();
        long position = 0;
        while (iterator.hasNext()) {
            Node child = iterator.nextNode();
            if (position++ < skip) {
                continue;
            }
            if (nodes.size() >= size) {
                break;
            }
            nodes.add(new GqlJcrNode(child));
        }
        if (total < 0) {
            // some iterators do not know their size: count what is left
            total = position;
            while (iterator.hasNext()) {
                iterator.nextNode();
                total++;
            }
        }
        return new GqlJcrNodeConnection(total, skip, size, nodes);
    }

    @GraphQLField
    public long getChildrenCount() throws RepositoryException {
        NodeIterator iterator = node.getNodes();
        long size = iterator.getSize();
        if (size >= 0) {
            return size;
        }
        long count = 0;
        while (iterator.hasNext()) {
            iterator.nextNode();
            count++;
        }
        return count;
    }

    @GraphQLField
    public boolean isHasChildren() throws RepositoryException {
        return node.hasNodes();
    }

    @GraphQLField
    @GraphQLDescription("Parent node, null for the root")
    public GqlJcrNodeRef getParent() throws RepositoryException {
        return node.getDepth() == 0 ? null : new GqlJcrNodeRef(node.getParent());
    }

    @GraphQLField
    @GraphQLDescription("Ancestors from the root down to the parent")
    public List<GqlJcrNodeRef> getAncestors() throws RepositoryException {
        List<GqlJcrNodeRef> ancestors = new ArrayList<>();
        for (int depth = 0; depth < node.getDepth(); depth++) {
            ancestors.add(new GqlJcrNodeRef((Node) node.getAncestor(depth)));
        }
        return ancestors;
    }

    @GraphQLField
    @GraphQLDescription("Definition under which this node sits in its parent")
    public GqlJcrChildNodeDefinition getDefinition() throws RepositoryException {
        // Jahia's wrapper returns null for the root node, the raw session throws for it
        if (node.getDepth() == 0 || node.getDefinition() == null) {
            return null;
        }
        return new GqlJcrChildNodeDefinition(node.getDefinition());
    }

    @GraphQLField
    public boolean isLocked() throws RepositoryException {
        return node.isLocked();
    }

    @GraphQLField
    @GraphQLDescription("Lock applying to this node (held by it or by an ancestor), null when unlocked")
    public GqlJcrLock getLock() throws RepositoryException {
        if (!node.isLocked()) {
            return null;
        }
        try {
            return new GqlJcrLock(node.getSession().getWorkspace().getLockManager().getLock(node.getPath()));
        } catch (LockException e) {
            return null;
        }
    }

    @GraphQLField
    @GraphQLDescription("Whether the node is mix:versionable")
    public boolean isVersionable() throws RepositoryException {
        return node.isNodeType("mix:versionable");
    }

    @GraphQLField
    @GraphQLDescription("javax.jcr.Node#isCheckedOut")
    public boolean isCheckedOut() throws RepositoryException {
        return node.isCheckedOut();
    }

    @GraphQLField
    @GraphQLDescription("Versions of a versionable node, oldest first; empty otherwise")
    public List<GqlJcrVersion> getVersions() throws RepositoryException {
        List<GqlJcrVersion> versions = new ArrayList<>();
        if (!node.isNodeType("mix:versionable")) {
            return versions;
        }
        try {
            VersionManager manager = node.getSession().getWorkspace().getVersionManager();
            VersionHistory history = manager.getVersionHistory(node.getPath());
            VersionIterator iterator = history.getAllVersions();
            while (iterator.hasNext()) {
                Version version = iterator.nextVersion();
                versions.add(new GqlJcrVersion(version, history));
            }
        } catch (UnsupportedRepositoryOperationException | PathNotFoundException e) {
            // no history yet
        }
        return versions;
    }

    @GraphQLField
    @GraphQLDescription("Base version name of a versionable node")
    public String getBaseVersion() throws RepositoryException {
        if (!node.isNodeType("mix:versionable")) {
            return null;
        }
        try {
            return node.getSession().getWorkspace().getVersionManager().getBaseVersion(node.getPath()).getName();
        } catch (UnsupportedRepositoryOperationException e) {
            return null;
        }
    }

    @GraphQLField
    @GraphQLDescription("Jahia level information, null with a RAW session")
    public GqlJcrJahiaNodeInfo getJahia() {
        return node instanceof JCRNodeWrapper ? new GqlJcrJahiaNodeInfo((JCRNodeWrapper) node) : null;
    }

    @GraphQLField
    @GraphQLDescription("Properties of other nodes referencing this node (REFERENCE then WEAKREFERENCE)")
    public List<GqlJcrReference> getReferences(
            @GraphQLName("limit") @GraphQLDescription("Maximum number of references, 100 by default") Integer limit) throws RepositoryException {
        int size = limit == null || limit < 1 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        List<GqlJcrReference> references = new ArrayList<>();
        collect(node.getReferences(), false, references, size);
        if (references.size() < size) {
            collect(node.getWeakReferences(), true, references, size);
        }
        return references;
    }

    @GraphQLField
    @GraphQLDescription("Number of REFERENCE plus WEAKREFERENCE properties pointing to this node")
    public long getReferencesCount() throws RepositoryException {
        return count(node.getReferences()) + count(node.getWeakReferences());
    }

    private static void collect(PropertyIterator iterator, boolean weak, List<GqlJcrReference> references, int size) throws RepositoryException {
        while (iterator.hasNext() && references.size() < size) {
            Property property = iterator.nextProperty();
            references.add(new GqlJcrReference(property, weak));
        }
    }

    private static long count(PropertyIterator iterator) {
        long size = iterator.getSize();
        if (size >= 0) {
            return size;
        }
        long count = 0;
        while (iterator.hasNext()) {
            iterator.nextProperty();
            count++;
        }
        return count;
    }
}
