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
import org.jahia.services.content.JCRSessionWrapper;

import javax.jcr.Session;

@GraphQLName("SuperToolsJcrSessionInfo")
@GraphQLDescription("The session a request works on")
public class GqlJcrSessionInfo {

    private final JcrSessions.Context context;
    private final Session session;

    public GqlJcrSessionInfo(JcrSessions.Context context, Session session) {
        this.context = context;
        this.session = session;
    }

    @GraphQLField
    public String getWorkspace() {
        return context.getWorkspace();
    }

    @GraphQLField
    @GraphQLDescription("RAW (javax.jcr session of the default provider) or JAHIA (JCRSessionWrapper)")
    public String getMode() {
        return context.getMode();
    }

    @GraphQLField
    @GraphQLDescription("Locale of a Jahia session, null for a raw session or when none was requested")
    public String getLanguage() {
        if (session instanceof JCRSessionWrapper && ((JCRSessionWrapper) session).getLocale() != null) {
            return ((JCRSessionWrapper) session).getLocale().toString();
        }
        return null;
    }

    @GraphQLField
    @GraphQLDescription("User the session was opened for (Session.getUserID)")
    public String getUserId() {
        return session.getUserID();
    }

    @GraphQLField
    @GraphQLDescription("Whether the session was opened for another user than the connected one")
    public boolean isImpersonated() {
        return context.getUser() != null;
    }

    @GraphQLField
    @GraphQLDescription("Whether this is a Jahia system session")
    public boolean isSystem() {
        return !(session instanceof JCRSessionWrapper) || ((JCRSessionWrapper) session).isSystem();
    }

    @GraphQLField
    public boolean isLive() {
        return session.isLive();
    }
}
