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
import org.jahia.services.content.JCRPropertyWrapper;

import javax.jcr.Property;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import java.util.ArrayList;
import java.util.List;

@GraphQLName("SuperToolsJcrProperty")
@GraphQLDescription("A javax.jcr.Property, read without any decoration")
public class GqlJcrProperty {

    private final Property property;

    public GqlJcrProperty(Property property) {
        this.property = property;
    }

    @GraphQLField
    public String getName() throws RepositoryException {
        return property.getName();
    }

    @GraphQLField
    public String getPath() throws RepositoryException {
        return property.getPath();
    }

    @GraphQLField
    @GraphQLDescription("javax.jcr.PropertyType name")
    public String getType() throws RepositoryException {
        return JcrTypes.name(property.getType());
    }

    @GraphQLField
    public boolean isMultiple() throws RepositoryException {
        return property.isMultiple();
    }

    @GraphQLField
    @GraphQLDescription("String form of a single value; binaries are summarized, null for a multi-valued property")
    public String getValue() throws RepositoryException {
        return property.isMultiple() ? null : render(property.getValue());
    }

    @GraphQLField
    @GraphQLDescription("String form of the values of a multi-valued property, null for a single-valued one")
    public List<String> getValues() throws RepositoryException {
        if (!property.isMultiple()) {
            return null;
        }
        List<String> values = new ArrayList<>();
        for (Value value : property.getValues()) {
            values.add(render(value));
        }
        return values;
    }

    @GraphQLField
    @GraphQLDescription("Length of the value(s) as reported by the repository (bytes for a binary)")
    public List<Long> getLengths() throws RepositoryException {
        List<Long> lengths = new ArrayList<>();
        if (property.isMultiple()) {
            for (long length : property.getLengths()) {
                lengths.add(length);
            }
        } else {
            lengths.add(property.getLength());
        }
        return lengths;
    }

    @GraphQLField
    @GraphQLDescription("Locale of an internationalized property read through a Jahia session, null otherwise")
    public String getLocale() {
        if (!(property instanceof JCRPropertyWrapper)) {
            return null;
        }
        try {
            return ((JCRPropertyWrapper) property).getLocale();
        } catch (RepositoryException e) {
            return null;
        }
    }

    @GraphQLField
    @GraphQLDescription("Whether the value comes from a translation node (Jahia session)")
    public boolean isInternationalized() {
        return getLocale() != null;
    }

    @GraphQLField
    @GraphQLDescription("Definition that applies to this property")
    public GqlJcrPropertyDefinition getDefinition() throws RepositoryException {
        return new GqlJcrPropertyDefinition(property.getDefinition());
    }

    @GraphQLField
    @GraphQLDescription("Shortcut on the definition")
    public boolean isProtected() throws RepositoryException {
        return property.getDefinition().isProtected();
    }

    @GraphQLField
    @GraphQLDescription("Nodes targeted by a REFERENCE or WEAKREFERENCE property; a dangling reference is skipped")
    public List<GqlJcrNodeRef> getReferencedNodes() throws RepositoryException {
        List<GqlJcrNodeRef> nodes = new ArrayList<>();
        int type = property.getType();
        if (type != PropertyType.REFERENCE && type != PropertyType.WEAKREFERENCE) {
            return nodes;
        }
        Value[] values = property.isMultiple() ? property.getValues() : new Value[]{property.getValue()};
        for (Value value : values) {
            try {
                nodes.add(new GqlJcrNodeRef(property.getSession().getNodeByIdentifier(value.getString())));
            } catch (RepositoryException | IllegalArgumentException e) {
                // dangling or malformed reference: the raw value is still available through value/values
            }
        }
        return nodes;
    }

    static String render(Value value) throws RepositoryException {
        if (value == null) {
            return null;
        }
        if (value.getType() == PropertyType.BINARY) {
            return "[binary, " + value.getBinary().getSize() + " bytes]";
        }
        return value.getString();
    }
}
