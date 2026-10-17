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
package org.jahia.community.supertools.gql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import org.jahia.community.supertools.gql.jcr.JcrSessions;
import org.jahia.community.supertools.gql.jcr.SuperToolsJcrMutation;
import org.jahia.community.supertools.gql.cache.CacheBrowserMutation;

@GraphQLName("SuperToolsMutation")
@GraphQLDescription("Jahia Super Tools mutations")
public class SuperToolsMutation {

    @GraphQLField
    @GraphQLName("cache")
    @GraphQLDescription("Flush HTML output cache entries")
    public CacheBrowserMutation getCache() {
        SuperToolsAccess.check();
        return new CacheBrowserMutation();
    }

    @GraphQLField
    @GraphQLName("jcr")
    @GraphQLDescription("Raw JCR mutations on a workspace (default or live), mirroring javax.jcr")
    public SuperToolsJcrMutation getJcr(
            @GraphQLName("workspace") @GraphQLDescription("Workspace name: default (the default) or live") String workspace,
            @GraphQLName("mode") @GraphQLDescription("RAW (the default): javax.jcr session of the default provider; JAHIA: JCRSessionWrapper with Jahia decorations") String mode,
            @GraphQLName("language") @GraphQLDescription("Locale of a JAHIA session, resolves internationalized properties and hides translation nodes") String language,
            @GraphQLName("user") @GraphQLDescription("User name to impersonate with a JAHIA session; the connected user by default") String user) {
        SuperToolsAccess.check();
        return new SuperToolsJcrMutation(new JcrSessions.Context(workspace, mode, language, user));
    }
}
