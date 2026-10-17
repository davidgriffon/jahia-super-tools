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

import javax.jcr.nodetype.NodeDefinition;
import javax.jcr.nodetype.NodeType;
import java.util.ArrayList;
import java.util.List;

@GraphQLName("SuperToolsJcrChildNodeDefinition")
@GraphQLDescription("A javax.jcr.nodetype.NodeDefinition")
public class GqlJcrChildNodeDefinition {

    private final NodeDefinition definition;

    public GqlJcrChildNodeDefinition(NodeDefinition definition) {
        this.definition = definition;
    }

    @GraphQLField
    @GraphQLDescription("Definition name, * for a residual definition")
    public String getName() {
        return definition.getName();
    }

    @GraphQLField
    public List<String> getRequiredPrimaryTypes() {
        List<String> names = new ArrayList<>();
        if (definition.getRequiredPrimaryTypes() != null) {
            for (NodeType type : definition.getRequiredPrimaryTypes()) {
                names.add(type.getName());
            }
        }
        return names;
    }

    @GraphQLField
    public String getDefaultPrimaryType() {
        return definition.getDefaultPrimaryType() == null ? null : definition.getDefaultPrimaryType().getName();
    }

    @GraphQLField
    public boolean isProtected() {
        return definition.isProtected();
    }

    @GraphQLField
    public boolean isMandatory() {
        return definition.isMandatory();
    }

    @GraphQLField
    public boolean isAutoCreated() {
        return definition.isAutoCreated();
    }

    @GraphQLField
    public boolean isAllowsSameNameSiblings() {
        return definition.allowsSameNameSiblings();
    }

    @GraphQLField
    public String getDeclaringNodeType() {
        return definition.getDeclaringNodeType() == null ? null : definition.getDeclaringNodeType().getName();
    }
}
