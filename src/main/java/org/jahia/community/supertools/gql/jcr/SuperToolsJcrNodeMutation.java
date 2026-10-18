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
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.jcr.Value;
import javax.jcr.ValueFactory;
import javax.jcr.lock.Lock;
import javax.jcr.lock.LockException;
import javax.jcr.lock.LockManager;
import javax.jcr.version.VersionManager;
import java.util.List;

/**
 * javax.jcr operations on one node. Each field is one transaction: the raw session is saved on success and
 * refreshed (changes discarded) on failure, so a failed call never leaves pending changes behind.
 */
@GraphQLName("SuperToolsJcrNodeMutation")
@GraphQLDescription("javax.jcr operations on one node; every call is saved immediately")
public class SuperToolsJcrNodeMutation {

    /** Every write is traced here: who, what, where, on which session. */
    private static final Logger audit = LoggerFactory.getLogger(SuperToolsJcrNodeMutation.class);

    private final JcrSessions.Context context;
    private final Session session;
    private final Node node;

    SuperToolsJcrNodeMutation(JcrSessions.Context context, Session session, Node node) {
        this.context = context;
        this.session = session;
        this.node = node;
    }

    private interface Operation<T> {
        T run() throws RepositoryException;
    }

    private <T> T saved(String what, Operation<T> operation) {
        String path;
        try {
            path = node.getPath();
        } catch (RepositoryException e) {
            path = "?";
        }
        try {
            T result = operation.run();
            session.save();
            audit.info("JCR Explorer: {} did '{}' on {} ({})", context.getActor(), what, path, context.describe());
            return result;
        } catch (RepositoryException | RuntimeException e) {
            audit.warn("JCR Explorer: {} failed '{}' on {} ({}): {}", context.getActor(), what, path, context.describe(), e.toString());
            try {
                session.refresh(false);
            } catch (RepositoryException ignored) {
                // the failure below is the one worth reporting
            }
            if (e instanceof DataFetchingException) {
                throw (DataFetchingException) e;
            }
            throw JcrSessions.fail(what + " failed", e);
        }
    }

    @GraphQLField
    @GraphQLDescription("The node as it is now")
    public GqlJcrNode getNode() {
        return new GqlJcrNode(node);
    }

    @GraphQLField
    @GraphQLName("setProperty")
    @GraphQLDescription("Node.setProperty with values created by the ValueFactory for the given javax.jcr.PropertyType name")
    public GqlJcrProperty writeProperty(
            @GraphQLName("name") @GraphQLNonNull String name,
            @GraphQLName("value") @GraphQLDescription("Single value") String value,
            @GraphQLName("values") @GraphQLDescription("Values of a multi-valued property; wins over value when given") List<String> values,
            @GraphQLName("type") @GraphQLDescription("javax.jcr.PropertyType name, STRING by default") String type) {
        return saved("setProperty " + name + " = " + summarize(value, values), () -> {
            int propertyType = JcrTypes.value(type);
            ValueFactory factory = session.getValueFactory();
            if (values != null) {
                Value[] converted = new Value[values.size()];
                for (int i = 0; i < values.size(); i++) {
                    converted[i] = factory.createValue(values.get(i), propertyType);
                }
                node.setProperty(name, converted);
            } else if (value == null) {
                throw new DataFetchingException("A value or values are required; use removeProperty to delete a property");
            } else {
                node.setProperty(name, factory.createValue(value, propertyType));
            }
            return new GqlJcrProperty(node.getProperty(name));
        });
    }

    @GraphQLField
    @GraphQLDescription("Property.remove")
    public boolean removeProperty(@GraphQLName("name") @GraphQLNonNull String name) {
        return saved("removeProperty " + name, () -> {
            if (!node.hasProperty(name)) {
                return false;
            }
            node.getProperty(name).remove();
            return true;
        });
    }

    @GraphQLField
    @GraphQLDescription("Node.addMixin")
    public GqlJcrNode addMixin(@GraphQLName("mixin") @GraphQLNonNull String mixin) {
        return saved("addMixin " + mixin, () -> {
            node.addMixin(mixin);
            return new GqlJcrNode(node);
        });
    }

    @GraphQLField
    @GraphQLDescription("Node.removeMixin")
    public GqlJcrNode removeMixin(@GraphQLName("mixin") @GraphQLNonNull String mixin) {
        return saved("removeMixin " + mixin, () -> {
            node.removeMixin(mixin);
            return new GqlJcrNode(node);
        });
    }

    @GraphQLField
    @GraphQLDescription("Node.addNode, with optional mixins")
    public GqlJcrNode addNode(
            @GraphQLName("name") @GraphQLNonNull String name,
            @GraphQLName("primaryType") @GraphQLDescription("Primary node type; the default type of the parent definition when omitted") String primaryType,
            @GraphQLName("mixins") List<String> mixins) {
        return saved("addNode " + name, () -> {
            Node child = primaryType == null || primaryType.trim().isEmpty() ? node.addNode(name) : node.addNode(name, primaryType.trim());
            if (mixins != null) {
                for (String mixin : mixins) {
                    child.addMixin(mixin);
                }
            }
            return new GqlJcrNode(child);
        });
    }

    @GraphQLField
    @GraphQLDescription("Session.move to the same parent under a new name; returns the new path")
    public String rename(@GraphQLName("name") @GraphQLNonNull String name) {
        return saved("rename to " + name, () -> {
            if (node.getDepth() == 0) {
                throw new DataFetchingException("The root node cannot be renamed");
            }
            String parentPath = node.getParent().getPath();
            String destination = ("/".equals(parentPath) ? "" : parentPath) + "/" + name;
            session.move(node.getPath(), destination);
            return destination;
        });
    }

    @GraphQLField
    @GraphQLDescription("Session.move to an absolute destination path (parent path plus new name); returns the new path")
    public String move(@GraphQLName("destinationPath") @GraphQLNonNull String destinationPath) {
        return saved("move to " + destinationPath, () -> {
            if (node.getDepth() == 0) {
                throw new DataFetchingException("The root node cannot be moved");
            }
            session.move(node.getPath(), destinationPath);
            return destinationPath;
        });
    }

    @GraphQLField
    @GraphQLDescription("Node.orderBefore on the children of this node; a null 'before' moves the child last")
    public boolean orderBefore(
            @GraphQLName("childName") @GraphQLNonNull String childName,
            @GraphQLName("beforeName") String beforeName) {
        return saved("orderBefore " + childName, () -> {
            node.orderBefore(childName, beforeName);
            return true;
        });
    }

    @GraphQLField
    @GraphQLDescription("Node.remove")
    public boolean remove() {
        return saved("remove", () -> {
            if (node.getDepth() == 0) {
                throw new DataFetchingException("The root node cannot be removed");
            }
            node.remove();
            return true;
        });
    }

    @GraphQLField
    @GraphQLDescription("LockManager.lock; an open-scoped lock survives this session, a session-scoped one is released with it")
    public GqlJcrLock lock(
            @GraphQLName("deep") Boolean deep,
            @GraphQLName("sessionScoped") Boolean sessionScoped,
            @GraphQLName("ownerInfo") String ownerInfo) {
        return saved("lock", () -> {
            if (!node.isNodeType("mix:lockable")) {
                node.addMixin("mix:lockable");
                session.save();
            }
            Lock lock = lockManager().lock(node.getPath(), Boolean.TRUE.equals(deep), Boolean.TRUE.equals(sessionScoped), Long.MAX_VALUE, ownerInfo);
            return new GqlJcrLock(lock);
        });
    }

    @GraphQLField
    @GraphQLDescription("LockManager.unlock; a lock token stored by Jahia in j:locktoken is added to the session first, "
            + "and Jahia's own lock types are cleared through its API when the raw unlock is refused")
    public boolean unlock() {
        return saved("unlock", () -> {
            LockManager manager = lockManager();
            String path = node.getPath();
            if (!manager.isLocked(path)) {
                return false;
            }
            try {
                manager.unlock(path);
                return true;
            } catch (LockException first) {
                if (node.hasProperty("j:locktoken")) {
                    try {
                        manager.addLockToken(node.getProperty("j:locktoken").getString());
                        manager.unlock(path);
                        return true;
                    } catch (RepositoryException ignored) {
                        // fall back to the Jahia API below
                    }
                }
                JCRSessionWrapper wrapper = JCRSessionFactory.getInstance().getCurrentSystemSession(session.getWorkspace().getName(), null, null);
                JCRNodeWrapper jahiaNode = wrapper.getNodeByIdentifier(node.getIdentifier());
                jahiaNode.clearAllLocks();
                wrapper.save();
                session.refresh(true);
                return true;
            }
        });
    }

    @GraphQLField
    @GraphQLDescription("VersionManager.checkin; returns the name of the created version")
    public String checkin() {
        return saved("checkin", () -> versionManager().checkin(node.getPath()).getName());
    }

    @GraphQLField
    @GraphQLDescription("VersionManager.checkout")
    public boolean checkout() {
        return saved("checkout", () -> {
            versionManager().checkout(node.getPath());
            return true;
        });
    }

    @GraphQLField
    @GraphQLDescription("VersionManager.restore to the named version of this node")
    public boolean restoreVersion(
            @GraphQLName("versionName") @GraphQLNonNull String versionName,
            @GraphQLName("removeExisting") @GraphQLDescription("Remove conflicting nodes, false by default") Boolean removeExisting) {
        return saved("restore " + versionName, () -> {
            versionManager().restore(node.getPath(), versionName, Boolean.TRUE.equals(removeExisting));
            return true;
        });
    }

    private static String summarize(String value, List<String> values) {
        String text = values != null ? String.valueOf(values) : String.valueOf(value);
        return text.length() > 200 ? text.substring(0, 200) + "... (" + text.length() + " chars)" : text;
    }

    private LockManager lockManager() throws RepositoryException {
        return session.getWorkspace().getLockManager();
    }

    private VersionManager versionManager() throws RepositoryException {
        return session.getWorkspace().getVersionManager();
    }
}
