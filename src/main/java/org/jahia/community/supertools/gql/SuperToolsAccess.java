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

import org.jahia.community.supertools.security.ToolsAccessGuard;
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;

/**
 * Applies the same rule as the Shiro chain protecting the tool JSPs ({@code perms[/tools:systemToolsAccess]}) to the
 * GraphQL fields of this module.
 */
public final class SuperToolsAccess {

    private SuperToolsAccess() {
        // utility class
    }

    /**
     * @throws DataFetchingException when the current user does not hold {@code systemToolsAccess} on {@code /tools}
     */
    public static void check() {
        if (!ToolsAccessGuard.isGranted()) {
            throw new DataFetchingException("Permission denied: the systemToolsAccess permission on /tools is required");
        }
    }
}
