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
package org.jahia.community.supertools.gql.cache;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Position of each part of a module cache key. Keys are built by the {@code CacheKeyPartGenerator}s of Jahia core
 * and joined with {@code @@}; the order below is the default order of the generators in Jahia 8.
 */
public final class CacheKeyParts {

    public static final String SEPARATOR = "@@";

    private static final List<String> PARTS = Collections.unmodifiableList(Arrays.asList(
            "lang", "path", "canonical", "template", "templateType", "acl", "context", "wrapped", "custom",
            "queryString", "templateNodes", "resourceId", "inArea", "site", "moduleParams", "ajax", "areaResource",
            "readOnly", "externalRef"));

    private CacheKeyParts() {
        // constants
    }

    public static List<String> names() {
        return PARTS;
    }

    /**
     * @return the index of the part in the key, or -1 when the name is unknown
     */
    public static int indexOf(String partName) {
        return partName == null ? -1 : PARTS.indexOf(partName);
    }

    public static String partOf(String key, int index) {
        if (key == null || index < 0) {
            return null;
        }
        String[] parts = key.split(SEPARATOR, -1);
        return index < parts.length ? parts[index] : null;
    }
}
