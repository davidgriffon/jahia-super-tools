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

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

/**
 * Registers this bundle with the GraphQL provider. The provider scans the bundle for {@code @GraphQLTypeExtension}
 * classes, so nothing has to be listed here. The module declares {@code graphql-dxm-provider} in its Jahia-Depends
 * header, hence the provider is always available when this component activates.
 */
@Component(immediate = true, service = DXGraphQLExtensionsProvider.class)
public class SuperToolsGraphQLExtensionsProvider implements DXGraphQLExtensionsProvider {
    // Extensions are discovered by scanning the current bundle.
}
