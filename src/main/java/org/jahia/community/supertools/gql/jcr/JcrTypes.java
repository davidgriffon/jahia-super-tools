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

import org.jahia.modules.graphql.provider.dxm.DataFetchingException;

import javax.jcr.PropertyType;
import java.util.Locale;

/**
 * javax.jcr.PropertyType names, exposed in the upper case form of the constants (STRING, WEAKREFERENCE...) rather
 * than the mixed case {@link PropertyType#nameFromValue} returns, and parsed back regardless of case.
 */
public final class JcrTypes {

    private static final int[] ALL = {PropertyType.STRING, PropertyType.BINARY, PropertyType.LONG, PropertyType.DOUBLE,
            PropertyType.DECIMAL, PropertyType.DATE, PropertyType.BOOLEAN, PropertyType.NAME, PropertyType.PATH,
            PropertyType.REFERENCE, PropertyType.WEAKREFERENCE, PropertyType.URI, PropertyType.UNDEFINED};

    private JcrTypes() {
        // utility class
    }

    public static String name(int type) {
        return PropertyType.nameFromValue(type).toUpperCase(Locale.ROOT);
    }

    public static int value(String name) {
        if (name == null || name.trim().isEmpty()) {
            return PropertyType.STRING;
        }
        for (int type : ALL) {
            if (PropertyType.nameFromValue(type).equalsIgnoreCase(name.trim())) {
                return type;
            }
        }
        throw new DataFetchingException("Unknown javax.jcr.PropertyType '" + name + "'");
    }
}
