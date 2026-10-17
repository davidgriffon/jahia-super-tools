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
import javax.jcr.Value;
import javax.jcr.nodetype.PropertyDefinition;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@GraphQLName("SuperToolsJcrPropertyDefinition")
@GraphQLDescription("A javax.jcr.nodetype.PropertyDefinition")
public class GqlJcrPropertyDefinition {

    private final PropertyDefinition definition;

    public GqlJcrPropertyDefinition(PropertyDefinition definition) {
        this.definition = definition;
    }

    @GraphQLField
    @GraphQLDescription("Definition name, * for a residual definition")
    public String getName() {
        return definition.getName();
    }

    @GraphQLField
    public String getRequiredType() {
        return JcrTypes.name(definition.getRequiredType());
    }

    @GraphQLField
    public boolean isMultiple() {
        return definition.isMultiple();
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
    public String getDeclaringNodeType() {
        return definition.getDeclaringNodeType() == null ? null : definition.getDeclaringNodeType().getName();
    }

    @GraphQLField
    public List<String> getValueConstraints() {
        return definition.getValueConstraints() == null ? Collections.emptyList() : Arrays.asList(definition.getValueConstraints());
    }

    @GraphQLField
    public List<String> getDefaultValues() throws RepositoryException {
        List<String> values = new ArrayList<>();
        if (definition.getDefaultValues() != null) {
            for (Value value : definition.getDefaultValues()) {
                values.add(value.getString());
            }
        }
        return values;
    }
}
