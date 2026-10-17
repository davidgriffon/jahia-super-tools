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
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.admin.GqlAdminMutation;

/**
 * Adds {@code mutation { admin { superTools { ... } } }} to the GraphQL schema.
 */
@GraphQLTypeExtension(GqlAdminMutation.class)
public class SuperToolsAdminMutationExtension {

    @GraphQLField
    @GraphQLName("superTools")
    @GraphQLDescription("Jahia Super Tools mutations (cache browser)")
    public static SuperToolsMutation getSuperTools() {
        return new SuperToolsMutation();
    }
}
