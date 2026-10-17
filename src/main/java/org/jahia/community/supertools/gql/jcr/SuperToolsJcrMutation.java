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
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import java.util.regex.Pattern;

/**
 * Write side of the raw JCR API. Every operation works on the raw session of the default provider and saves it.
 */
@GraphQLName("SuperToolsJcrMutation")
@GraphQLDescription("Raw JCR mutations on one workspace, mirroring javax.jcr")
public class SuperToolsJcrMutation {

    /** The repository internals: never written by this tool. */
    private static final Pattern SYSTEM_SUBTREE = Pattern.compile("^/jcr:system(/.*)?$");

    /** Users, groups, roles, permissions, ACLs: written only once the caller acknowledged it. */
    private static final Pattern SENSITIVE_SUBTREE = Pattern.compile(
            "^/(users|groups|roles|permissions|settings)(/.*)?$|^/sites/[^/]+/(users|groups)(/.*)?$|(^|.*/)j:acl(/.*)?$");

    private final JcrSessions.Context context;

    public SuperToolsJcrMutation(JcrSessions.Context context) {
        this.context = context;
    }

    @GraphQLField
    @GraphQLDescription("Workspace name")
    public String getWorkspace() {
        return context.getWorkspace();
    }

    @GraphQLField
    @GraphQLDescription("Operations on one node, resolved by uuid when given, by path otherwise. /jcr:system is never writable; "
            + "users, groups, roles, permissions, settings and j:acl subtrees need acknowledgeSensitive: true")
    public SuperToolsJcrNodeMutation mutateNode(
            @GraphQLName("path") @GraphQLDescription("Absolute path") String path,
            @GraphQLName("uuid") @GraphQLDescription("Node identifier, takes precedence over path") String uuid,
            @GraphQLName("acknowledgeSensitive") @GraphQLDescription("Confirms a write in a sensitive subtree (users, groups, roles, permissions, settings, j:acl)") Boolean acknowledgeSensitive) {
        Session session = JcrSessions.open(context);
        Node node = JcrSessions.node(session, path, uuid);
        try {
            String nodePath = node.getPath();
            if (SYSTEM_SUBTREE.matcher(nodePath).matches()) {
                throw new DataFetchingException("Refused: " + nodePath + " is under /jcr:system, which this tool never writes");
            }
            if (isSensitive(nodePath) && !Boolean.TRUE.equals(acknowledgeSensitive)) {
                throw new DataFetchingException("Refused: " + nodePath + " is in a sensitive subtree (users, groups, roles, permissions, "
                        + "settings or ACLs); resend with acknowledgeSensitive: true once the change is confirmed");
            }
        } catch (RepositoryException e) {
            throw JcrSessions.fail(e);
        }
        return new SuperToolsJcrNodeMutation(context, session, node);
    }

    public static boolean isSensitive(String path) {
        return path != null && SENSITIVE_SUBTREE.matcher(path).matches();
    }
}
