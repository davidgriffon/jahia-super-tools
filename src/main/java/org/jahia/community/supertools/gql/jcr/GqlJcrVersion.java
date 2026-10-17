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
import javax.jcr.version.Version;
import javax.jcr.version.VersionHistory;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@GraphQLName("SuperToolsJcrVersion")
@GraphQLDescription("A javax.jcr.version.Version")
public class GqlJcrVersion {

    private final Version version;
    private final VersionHistory history;

    public GqlJcrVersion(Version version, VersionHistory history) {
        this.version = version;
        this.history = history;
    }

    @GraphQLField
    public String getName() throws RepositoryException {
        return version.getName();
    }

    @GraphQLField
    public String getUuid() throws RepositoryException {
        return version.getIdentifier();
    }

    @GraphQLField
    @GraphQLDescription("Creation date (ISO-8601)")
    public String getCreated() throws RepositoryException {
        return Instant.ofEpochMilli(version.getCreated().getTimeInMillis()).toString();
    }

    @GraphQLField
    public List<String> getLabels() throws RepositoryException {
        return Arrays.asList(history.getVersionLabels(version));
    }

    @GraphQLField
    public List<String> getPredecessors() throws RepositoryException {
        return names(version.getPredecessors());
    }

    @GraphQLField
    public List<String> getSuccessors() throws RepositoryException {
        return names(version.getSuccessors());
    }

    @GraphQLField
    @GraphQLDescription("Primary type recorded in the frozen node")
    public String getFrozenPrimaryType() throws RepositoryException {
        return version.getFrozenNode().hasProperty("jcr:frozenPrimaryType") ? version.getFrozenNode().getProperty("jcr:frozenPrimaryType").getString() : null;
    }

    @GraphQLField
    @GraphQLDescription("Whether this is the root version of the history")
    public boolean isRootVersion() throws RepositoryException {
        return history.getRootVersion().isSame(version);
    }

    private static List<String> names(Version[] versions) throws RepositoryException {
        List<String> names = new ArrayList<>();
        for (Version other : versions) {
            names.add(other.getName());
        }
        return names;
    }
}
