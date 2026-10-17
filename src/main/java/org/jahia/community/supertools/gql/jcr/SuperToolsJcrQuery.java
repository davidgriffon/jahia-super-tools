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

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import javax.jcr.nodetype.NoSuchNodeTypeException;
import javax.jcr.nodetype.NodeType;
import javax.jcr.nodetype.NodeTypeIterator;
import javax.jcr.nodetype.NodeTypeManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Read side of the raw JCR API: a {@link javax.jcr.Session} on one workspace of the default provider.
 */
@GraphQLName("SuperToolsJcrQuery")
@GraphQLDescription("Raw JCR access to one workspace, mirroring javax.jcr")
public class SuperToolsJcrQuery {

    private final JcrSessions.Context context;

    public SuperToolsJcrQuery(JcrSessions.Context context) {
        this.context = context;
    }

    @GraphQLField
    @GraphQLDescription("Workspace name")
    public String getWorkspace() {
        return context.getWorkspace();
    }

    @GraphQLField
    @GraphQLDescription("The session this request works on")
    public GqlJcrSessionInfo getSession() {
        return new GqlJcrSessionInfo(context, JcrSessions.open(context));
    }

    @GraphQLField
    @GraphQLDescription("Languages declared by the sites (j:languages), sorted; what a Jahia session can be opened in")
    public List<String> getLanguages() {
        try {
            Session session = JcrSessions.raw(context.getWorkspace());
            java.util.TreeSet<String> languages = new java.util.TreeSet<>();
            javax.jcr.NodeIterator sites = session.getNode("/sites").getNodes();
            while (sites.hasNext()) {
                Node site = sites.nextNode();
                if (site.hasProperty("j:languages")) {
                    for (javax.jcr.Value value : site.getProperty("j:languages").getValues()) {
                        languages.add(value.getString());
                    }
                }
            }
            return new ArrayList<>(languages);
        } catch (RepositoryException e) {
            throw JcrSessions.fail(e);
        }
    }

    @GraphQLField
    @GraphQLDescription("Session.getNodeByIdentifier when uuid is given, Session.getNode otherwise (the root node by default)")
    public GqlJcrNode node(
            @GraphQLName("path") @GraphQLDescription("Absolute path") String path,
            @GraphQLName("uuid") @GraphQLDescription("Node identifier, takes precedence over path") String uuid) {
        return new GqlJcrNode(JcrSessions.node(JcrSessions.open(context), path, uuid));
    }

    @GraphQLField
    @GraphQLDescription("Registered node types (NodeTypeManager), sorted by name")
    public List<GqlJcrNodeType> nodeTypes(
            @GraphQLName("mixinsOnly") @GraphQLDescription("Only mixin types") Boolean mixinsOnly,
            @GraphQLName("nameContains") @GraphQLDescription("Case-insensitive filter on the type name") String nameContains) {
        try {
            Session session = JcrSessions.raw(context.getWorkspace());
            NodeTypeManager manager = session.getWorkspace().getNodeTypeManager();
            NodeTypeIterator iterator = Boolean.TRUE.equals(mixinsOnly) ? manager.getMixinNodeTypes() : manager.getAllNodeTypes();
            String needle = nameContains == null ? null : nameContains.trim().toLowerCase(Locale.ROOT);
            List<NodeType> types = new ArrayList<>();
            while (iterator.hasNext()) {
                NodeType type = iterator.nextNodeType();
                if (needle == null || needle.isEmpty() || type.getName().toLowerCase(Locale.ROOT).contains(needle)) {
                    types.add(type);
                }
            }
            types.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
            List<GqlJcrNodeType> result = new ArrayList<>();
            for (NodeType type : types) {
                result.add(new GqlJcrNodeType(type));
            }
            return result;
        } catch (RepositoryException e) {
            throw JcrSessions.fail(e);
        }
    }

    @GraphQLField
    @GraphQLDescription("One registered node type, null when unknown")
    public GqlJcrNodeType nodeType(@GraphQLName("name") @GraphQLNonNull String name) {
        try {
            return new GqlJcrNodeType(JcrSessions.raw(context.getWorkspace()).getWorkspace().getNodeTypeManager().getNodeType(name));
        } catch (NoSuchNodeTypeException e) {
            return null;
        } catch (RepositoryException e) {
            throw JcrSessions.fail(e);
        }
    }
}
