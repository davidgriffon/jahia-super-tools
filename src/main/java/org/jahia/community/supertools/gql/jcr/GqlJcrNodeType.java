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
import javax.jcr.nodetype.PropertyDefinition;
import java.util.ArrayList;
import java.util.List;

@GraphQLName("SuperToolsJcrNodeType")
@GraphQLDescription("A javax.jcr.nodetype.NodeType")
public class GqlJcrNodeType {

    private final NodeType type;

    public GqlJcrNodeType(NodeType type) {
        this.type = type;
    }

    @GraphQLField
    public String getName() {
        return type.getName();
    }

    @GraphQLField
    public boolean isMixin() {
        return type.isMixin();
    }

    @GraphQLField
    public boolean isAbstract() {
        return type.isAbstract();
    }

    @GraphQLField
    public boolean isQueryable() {
        return type.isQueryable();
    }

    @GraphQLField
    public boolean isHasOrderableChildNodes() {
        return type.hasOrderableChildNodes();
    }

    @GraphQLField
    public String getPrimaryItemName() {
        return type.getPrimaryItemName();
    }

    @GraphQLField
    @GraphQLDescription("Declared supertypes")
    public List<String> getSupertypes() {
        List<String> names = new ArrayList<>();
        for (NodeType supertype : type.getDeclaredSupertypes()) {
            names.add(supertype.getName());
        }
        return names;
    }

    @GraphQLField
    @GraphQLDescription("All property definitions, inherited ones included")
    public List<GqlJcrPropertyDefinition> getPropertyDefinitions() {
        List<GqlJcrPropertyDefinition> definitions = new ArrayList<>();
        for (PropertyDefinition definition : type.getPropertyDefinitions()) {
            definitions.add(new GqlJcrPropertyDefinition(definition));
        }
        return definitions;
    }

    @GraphQLField
    @GraphQLDescription("All child node definitions, inherited ones included")
    public List<GqlJcrChildNodeDefinition> getChildNodeDefinitions() {
        List<GqlJcrChildNodeDefinition> definitions = new ArrayList<>();
        for (NodeDefinition definition : type.getChildNodeDefinitions()) {
            definitions.add(new GqlJcrChildNodeDefinition(definition));
        }
        return definitions;
    }
}
