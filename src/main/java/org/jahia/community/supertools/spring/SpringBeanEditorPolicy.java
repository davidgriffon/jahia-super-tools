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
package org.jahia.community.supertools.spring;

import java.util.regex.Pattern;

/**
 * What the bean editor refuses to show or to change.
 *
 * <ul>
 *     <li>Denied beans never appear: the platform settings ({@code settingsBean} drives the operating mode, the
 *     read-only mode and the upload limits of the whole instance), data sources and session factories, everything
 *     related to security, authentication, licensing or secrets.</li>
 *     <li>Sensitive properties (passwords, secrets, tokens, keys...) of the other beans are listed masked, are never
 *     editable and are never written to the override file.</li>
 * </ul>
 * The patterns are matched against the bean name and the bean class name, case-insensitively.
 */
public final class SpringBeanEditorPolicy {

    public static final String MASK = "********";

    private static final Pattern DENIED_BEAN = Pattern.compile(
            "(?i).*(settingsbean|jahiaproperties|datasource|sessionfactory|security|authentication|authpipeline|authvalve"
                    + "|license|password|credential|secret|keystore|crypt|jwt|token|shiro|realm).*");

    private static final Pattern SENSITIVE_PROPERTY = Pattern.compile("(?i).*(password|passwd|pwd|secret|credential|token|key|salt).*");

    private SpringBeanEditorPolicy() {
        // constants
    }

    public static boolean isBeanDenied(String beanName, Class<?> beanClass) {
        return (beanName != null && DENIED_BEAN.matcher(beanName).matches())
                || (beanClass != null && DENIED_BEAN.matcher(beanClass.getName()).matches());
    }

    public static boolean isSensitive(String propertyName) {
        return propertyName != null && SENSITIVE_PROPERTY.matcher(propertyName).matches();
    }
}
