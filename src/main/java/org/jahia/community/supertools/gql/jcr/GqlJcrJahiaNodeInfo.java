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
import org.jahia.services.visibility.VisibilityService;

import javax.jcr.RepositoryException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * What a Jahia session adds on top of javax.jcr: the node is a JCRNodeWrapperImpl, so the Jahia services apply.
 */
@GraphQLName("SuperToolsJcrJahiaNodeInfo")
@GraphQLDescription("Jahia level information of a node, available with a JAHIA session only")
public class GqlJcrJahiaNodeInfo {

    private final JCRNodeWrapper node;

    public GqlJcrJahiaNodeInfo(JCRNodeWrapper node) {
        this.node = node;
    }

    @GraphQLField
    @GraphQLDescription("JCRNodeWrapper.getDisplayableName in the session locale")
    public String getDisplayableName() {
        return node.getDisplayableName();
    }

    @GraphQLField
    @GraphQLDescription("Language of the session the node was read with")
    public String getLanguage() {
        return node.getLanguage();
    }

    @GraphQLField
    @GraphQLDescription("Locales the node has a translation for (JCRNodeWrapper.getExistingLocales)")
    public List<String> getExistingLocales() throws RepositoryException {
        List<String> locales = new ArrayList<>();
        for (Locale locale : node.getExistingLocales()) {
            locales.add(locale.toString());
        }
        return locales;
    }

    @GraphQLField
    @GraphQLDescription("VisibilityService.matchesConditions: whether the visibility conditions of the node are met now")
    public boolean isVisible() {
        return VisibilityService.getInstance().matchesConditions(node);
    }

    @GraphQLField
    @GraphQLDescription("JCRNodeWrapper.checkValidity: visible and valid in the session language (invalid languages, visibility, expiration)")
    public boolean isValid() {
        return node.checkValidity();
    }

    @GraphQLField
    @GraphQLDescription("Whether the node carries jmix:conditionalVisibility")
    public boolean isHasVisibilityConditions() throws RepositoryException {
        return node.isNodeType("jmix:conditionalVisibility");
    }

    @GraphQLField
    @GraphQLDescription("JCRNodeWrapper.isMarkedForDeletion")
    public boolean isMarkedForDeletion() throws RepositoryException {
        return node.isMarkedForDeletion();
    }

    @GraphQLField
    @GraphQLDescription("JCRNodeWrapper.getLastPublishedAsDate (ISO-8601), null when never published")
    public String getLastPublished() {
        return node.getLastPublishedAsDate() == null ? null : Instant.ofEpochMilli(node.getLastPublishedAsDate().getTime()).toString();
    }

    @GraphQLField
    @GraphQLDescription("JCRNodeWrapper.hasPermission for the user of the session")
    public boolean hasPermission(@GraphQLName("name") @GraphQLNonNull @GraphQLDescription("Permission name, e.g. jcr:write or jcr:read_live") String name) {
        return node.hasPermission(name);
    }

    @GraphQLField
    @GraphQLDescription("Primary type and mixins as Jahia lists them")
    public List<String> getNodeTypes() throws RepositoryException {
        return node.getNodeTypes();
    }

    @GraphQLField
    @GraphQLDescription("Jahia lock information: one entry per language ('' for the whole node) with its lock types")
    public List<String> getLockInfos() throws RepositoryException {
        List<String> infos = new ArrayList<>();
        Map<String, List<String>> lockInfos = node.getLockInfos();
        if (lockInfos != null) {
            for (Map.Entry<String, List<String>> entry : lockInfos.entrySet()) {
                infos.add((entry.getKey() == null || entry.getKey().isEmpty() ? "node" : entry.getKey()) + ": " + String.join(", ", entry.getValue()));
            }
        }
        return infos;
    }

    @GraphQLField
    @GraphQLDescription("Locales locked for the user of the session")
    public List<String> getLockedLocales() throws RepositoryException {
        List<String> locales = new ArrayList<>();
        for (Locale locale : node.getLockedLocales()) {
            locales.add(locale.toString());
        }
        return locales;
    }

    @GraphQLField
    @GraphQLDescription("Site the node resolves to, null outside sites")
    public String getSiteKey() throws RepositoryException {
        return node.getResolveSite() == null ? null : node.getResolveSite().getSiteKey();
    }
}
