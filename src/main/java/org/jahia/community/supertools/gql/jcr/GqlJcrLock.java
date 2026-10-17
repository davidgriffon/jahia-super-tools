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

import javax.jcr.RepositoryException;
import javax.jcr.lock.Lock;

@GraphQLName("SuperToolsJcrLock")
@GraphQLDescription("A javax.jcr.lock.Lock")
public class GqlJcrLock {

    private final Lock lock;

    public GqlJcrLock(Lock lock) {
        this.lock = lock;
    }

    @GraphQLField
    @GraphQLDescription("Lock owner as recorded by the repository")
    public String getOwner() {
        return lock.getLockOwner();
    }

    @GraphQLField
    public boolean isDeep() {
        return lock.isDeep();
    }

    @GraphQLField
    public boolean isSessionScoped() {
        return lock.isSessionScoped();
    }

    @GraphQLField
    @GraphQLDescription("Whether the current session holds the lock token")
    public boolean isLockOwningSession() {
        return lock.isLockOwningSession();
    }

    @GraphQLField
    @GraphQLDescription("Lock token, null when the current session does not own it")
    public String getLockToken() {
        return lock.getLockToken();
    }

    @GraphQLField
    @GraphQLDescription("Path of the node holding the lock (an ancestor for a deep lock)")
    public String getNodePath() throws RepositoryException {
        return lock.getNode().getPath();
    }

    @GraphQLField
    public boolean isLive() throws RepositoryException {
        return lock.isLive();
    }
}
