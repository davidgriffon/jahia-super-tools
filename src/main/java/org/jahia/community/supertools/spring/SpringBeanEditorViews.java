/*
 * Copyright (C) 2002-2022 Jahia Solutions Group SA. All rights reserved.
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

import org.jahia.community.supertools.spring.SpringBeanEditorHelper.BeanProperty;
import org.jahia.community.supertools.spring.SpringBeanEditorHelper.ContextInfo;
import org.springframework.beans.factory.config.BeanDefinition;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the plain maps the bean editor's JSON API serializes: the list of contexts, the beans of a context, and the
 * full view of one bean with its properties and their status. Kept free of servlet types so it can be unit tested.
 */
public final class SpringBeanEditorViews {

    private SpringBeanEditorViews() {
        // utility class
    }

    /**
     * The override store of a context, or {@code null} when the context cannot persist (only the core context can).
     */
    public static SpringBeanOverrideStore storeFor(ContextInfo context) {
        return context != null && SpringBeanEditorHelper.CORE_CONTEXT_ID.equals(context.getId())
                ? SpringBeanOverrideStore.forCoreContext() : null;
    }

    public static Map<String, Object> contexts() {
        List<Map<String, Object>> contexts = new ArrayList<>();
        for (ContextInfo info : SpringBeanEditorHelper.getContexts()) {
            Map<String, Object> context = new LinkedHashMap<>();
            context.put("id", info.getId());
            context.put("label", info.getLabel());
            context.put("beanCount", info.getBeanCount());
            context.put("persistable", SpringBeanEditorHelper.CORE_CONTEXT_ID.equals(info.getId()));
            contexts.add(context);
        }
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("contexts", contexts);
        return view;
    }

    public static Map<String, Object> beans(ContextInfo context, SpringBeanOverrideStore store) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("context", context.getId());
        view.put("label", context.getLabel());
        view.put("beans", SpringBeanEditorHelper.getBeanNames(context.getContext()));
        putStore(view, store);
        return view;
    }

    /**
     * The view of one bean, or {@code null} when the name is not an instantiated singleton of the context.
     */
    public static Map<String, Object> bean(ContextInfo context, String beanName, SpringBeanOverrideStore store) {
        Object bean = SpringBeanEditorHelper.getBean(context.getContext(), beanName);
        if (bean == null) {
            return null;
        }
        BeanDefinition definition = SpringBeanEditorHelper.getBeanDefinition(context.getContext(), beanName);
        Map<String, String> persisted = Collections.emptyMap();
        String storeError = null;
        if (store != null) {
            try {
                persisted = store.read(beanName);
            } catch (IllegalStateException e) {
                storeError = e.getMessage();
            }
        }
        String resource = SpringBeanEditorHelper.getDefinitionResource(definition);

        Map<String, Object> view = new LinkedHashMap<>();
        view.put("context", context.getId());
        view.put("name", beanName);
        view.put("className", bean.getClass().getName());
        view.put("definitionResource", resource);
        view.put("definitionOverridden", SpringBeanEditorHelper.isOverrideResource(resource));
        view.put("persistedCount", persisted.size());
        putStore(view, store);
        if (storeError != null) {
            view.put("storeError", storeError);
        }
        List<Map<String, Object>> properties = new ArrayList<>();
        for (BeanProperty property : SpringBeanEditorHelper.getEditableProperties(bean, definition, persisted)) {
            properties.add(property(property));
        }
        view.put("properties", properties);
        return view;
    }

    static Map<String, Object> property(BeanProperty property) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("name", property.getName());
        view.put("type", property.getTypeName());
        view.put("value", property.getValue());
        view.put("readable", property.isReadable());
        view.put("writable", property.isWritable());
        view.put("persistable", property.isPersistable());
        view.put("sensitive", property.isSensitive());
        view.put("primitive", property.isPrimitive());
        view.put("boolean", property.isBoolean());
        view.put("source", property.getSource());
        view.put("configuredValue", property.getConfiguredValue());
        view.put("configuredByReference", property.isConfiguredByReference());
        view.put("persistedValue", property.getPersistedValue());
        view.put("status", property.getStatus().name());
        view.put("statusLabel", property.getStatus().getLabel());
        view.put("statusDescription", property.getStatus().getDescription());
        return view;
    }

    /**
     * Everything the override file of the core context holds, so that an operator sees at a glance what this tool
     * pins at startup. Values of sensitive properties are masked.
     */
    public static Map<String, Object> overrides(SpringBeanOverrideStore store) {
        Map<String, Object> view = new LinkedHashMap<>();
        putStore(view, store);
        List<Map<String, Object>> entries = new ArrayList<>();
        String error = null;
        try {
            for (Map.Entry<String, Map<String, String>> bean : store.read().entrySet()) {
                for (Map.Entry<String, String> property : bean.getValue().entrySet()) {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    entry.put("bean", bean.getKey());
                    entry.put("property", property.getKey());
                    entry.put("value", SpringBeanEditorPolicy.isSensitive(property.getKey()) ? SpringBeanEditorPolicy.MASK : property.getValue());
                    entry.put("beanDenied", SpringBeanEditorPolicy.isBeanDenied(bean.getKey(), null));
                    entries.add(entry);
                }
            }
        } catch (IllegalStateException e) {
            error = e.getMessage();
        }
        view.put("entries", entries);
        if (error != null) {
            view.put("storeError", error);
        }
        return view;
    }

    private static void putStore(Map<String, Object> view, SpringBeanOverrideStore store) {
        view.put("persistable", store != null);
        if (store != null) {
            view.put("storeFile", store.getFile().getAbsolutePath());
            view.put("storeExists", store.exists());
        }
    }
}
