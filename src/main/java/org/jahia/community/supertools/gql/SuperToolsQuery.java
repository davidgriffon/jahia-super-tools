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
import org.jahia.community.supertools.gql.jcr.SuperToolsJcrQuery;
import org.jahia.community.supertools.gql.cache.CacheBrowserQuery;

@GraphQLName("SuperToolsQuery")
@GraphQLDescription("Jahia Super Tools queries")
public class SuperToolsQuery {

    @GraphQLField
    @GraphQLName("cache")
    @GraphQLDescription("Browse the HTML output cache (module cache) entries and statistics")
    public CacheBrowserQuery getCache() {
        SuperToolsAccess.check();
        return new CacheBrowserQuery();
    }

    @GraphQLField
    @GraphQLName("jcr")
    @GraphQLDescription("Raw JCR read access to a workspace (default or live), mirroring javax.jcr")
    public SuperToolsJcrQuery getJcr(
            @GraphQLName("workspace") @GraphQLDescription("Workspace name: default (the default) or live") String workspace,
            @GraphQLName("mode") @GraphQLDescription("RAW (the default): javax.jcr session of the default provider; JAHIA: JCRSessionWrapper with Jahia decorations") String mode,
            @GraphQLName("language") @GraphQLDescription("Locale of a JAHIA session, resolves internationalized properties and hides translation nodes") String language,
            @GraphQLName("user") @GraphQLDescription("User name to impersonate with a JAHIA session; the connected user by default") String user) {
        SuperToolsAccess.check();
        return new SuperToolsJcrQuery(new JcrSessions.Context(workspace, mode, language, user));
    }
}
