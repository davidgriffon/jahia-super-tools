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

import org.apache.commons.lang3.StringUtils;
import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.registries.ServicesRegistry;
import org.jahia.services.SpringContextSingleton;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.PropertyValue;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.config.TypedStringValue;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/**
 * Reads and writes the String and primitive JavaBean properties of the singletons of a Spring context.
 *
 * <p>Only accessors are used: a value is read through its getter and written through its setter, so what the editor
 * shows and changes is the public contract of the bean, never a private field. The {@link SpringBeanEditorPolicy}
 * hides the beans that must not be touched (platform settings, data sources, security) and masks the properties
 * whose name looks like a secret.
 */
public final class SpringBeanEditorHelper {

    private static final Logger logger = LoggerFactory.getLogger(SpringBeanEditorHelper.class);

    /** Identifier of the Jahia core Spring context in the context selector. */
    public static final String CORE_CONTEXT_ID = "core";

    /** Prefix of a module context identifier in the context selector; the module id follows. */
    public static final String MODULE_CONTEXT_PREFIX = "module:";

    private SpringBeanEditorHelper() {
        // utility class
    }

    /**
     * A Spring context available for edition.
     */
    public static final class ContextInfo {
        private final String id;
        private final String label;
        private final ApplicationContext context;

        ContextInfo(String id, String label, ApplicationContext context) {
            this.id = id;
            this.label = label;
            this.context = context;
        }

        public String getId() {
            return id;
        }

        public String getLabel() {
            return label;
        }

        public ApplicationContext getContext() {
            return context;
        }

        public int getBeanCount() {
            return getBeanNames(context).size();
        }
    }

    /**
     * Where the value shown for a property comes from, relative to the bean's Spring configuration.
     */
    public enum ValueStatus {
        /** The value is what the code initialised; the Spring configuration does not set this property. */
        DEFAULT("runtime default", "The Spring configuration does not set this property; the value comes from the code."),
        /** The value is the one set by the bean's Spring configuration. */
        CONFIGURED("from configuration", "The value is the one set by the Spring configuration of the bean."),
        /** The value was changed in memory and differs from the configured one; it is lost on restart. */
        MEMORY("changed in memory", "The value differs from the Spring configuration and is not persisted: it is lost on restart."),
        /** A persisted override exists and the value in memory matches it. */
        PERSISTED("persisted override", "The value is overridden by the bean editor file and is applied in memory."),
        /** A persisted override exists but the value in memory differs from it. */
        PERSISTED_PENDING("persisted override, differs in memory", "The bean editor file overrides this property with"
                + " another value: the file value applies at the next restart, the value in memory is what runs now.");

        private final String label;
        private final String description;

        ValueStatus(String label, String description) {
            this.label = label;
            this.description = description;
        }

        public String getLabel() {
            return label;
        }

        public String getDescription() {
            return description;
        }
    }

    /**
     * A String or primitive property of a bean, as shown in the editor.
     */
    public static final class BeanProperty {
        private final String name;
        private final Class<?> type;
        private final String value;
        private final boolean readable;
        private final boolean writable;
        private final boolean hasSetter;
        private final String source;
        private final boolean sensitive;
        private String configuredValue;
        private boolean configuredByReference;
        private String persistedValue;

        BeanProperty(String name, Class<?> type, String value, boolean readable, boolean writable, boolean hasSetter,
                String source) {
            this.name = name;
            this.type = type;
            this.sensitive = SpringBeanEditorPolicy.isSensitive(name);
            // A sensitive value is shown masked, never edited, never persisted.
            this.value = sensitive && value != null ? SpringBeanEditorPolicy.MASK : value;
            this.readable = readable;
            this.writable = writable && !sensitive;
            this.hasSetter = hasSetter;
            this.source = source;
        }

        /** Whether a Spring override file can set this property: only a property with a setter can, and never a secret. */
        public boolean isPersistable() {
            return hasSetter && !sensitive;
        }

        /** Whether the name looks like a secret: the value is masked and the property is read only. */
        public boolean isSensitive() {
            return sensitive;
        }

        /** The literal the bean's Spring definition sets for this property, or {@code null} when it sets none. */
        public String getConfiguredValue() {
            return configuredValue;
        }

        /** Whether the Spring definition sets this property from another bean or an expression rather than a literal. */
        public boolean isConfiguredByReference() {
            return configuredByReference;
        }

        /** The value the bean editor override file holds for this property, or {@code null} when it holds none. */
        public String getPersistedValue() {
            return persistedValue;
        }

        public ValueStatus getStatus() {
            if (sensitive) {
                // masked values cannot be compared: report where the configuration comes from, nothing more
                if (persistedValue != null) {
                    return ValueStatus.PERSISTED;
                }
                return configuredValue != null || configuredByReference ? ValueStatus.CONFIGURED : ValueStatus.DEFAULT;
            }
            // An unreadable value cannot be compared, so never claim it differs from the configuration or the file.
            if (persistedValue != null) {
                return !readable || sameValue(persistedValue) ? ValueStatus.PERSISTED : ValueStatus.PERSISTED_PENDING;
            }
            if (configuredValue == null && !configuredByReference) {
                return ValueStatus.DEFAULT;
            }
            if (readable && configuredValue != null && !sameValue(configuredValue)) {
                return ValueStatus.MEMORY;
            }
            return ValueStatus.CONFIGURED;
        }

        /**
         * Compares a configured or persisted literal with the value in memory the way the type does, so that a
         * {@code float} configured as {@code 16} matches its in-memory rendering {@code 16.0}.
         */
        private boolean sameValue(String literal) {
            if (Objects.equals(literal, value)) {
                return true;
            }
            if (value == null) {
                return false;
            }
            try {
                return Objects.equals(String.valueOf(convert(literal, type, name)), value);
            } catch (IllegalArgumentException e) {
                return false;
            }
        }

        public String getName() {
            return name;
        }

        public Class<?> getType() {
            return type;
        }

        public String getTypeName() {
            return type.getSimpleName();
        }

        /** Current value rendered as text, or {@code null} when the value is {@code null} or cannot be read. */
        public String getValue() {
            return value;
        }

        public boolean isReadable() {
            return readable;
        }

        public boolean isWritable() {
            return writable;
        }

        public boolean isBoolean() {
            return type == boolean.class || type == Boolean.class;
        }

        public boolean isPrimitive() {
            return type.isPrimitive();
        }

        /** How the property is reached: always {@code accessor} now that fields are not read. */
        public String getSource() {
            return source;
        }
    }

    /**
     * Returns the Spring contexts available in this Jahia instance: the core context first, then the context of every
     * module that has one, sorted by module id.
     */
    public static List<ContextInfo> getContexts() {
        List<ContextInfo> contexts = new ArrayList<>();
        ApplicationContext core = getCoreContext();
        if (core != null) {
            contexts.add(new ContextInfo(CORE_CONTEXT_ID, "Jahia core", core));
        }
        Map<String, ContextInfo> modules = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (JahiaTemplatesPackage pkg : getModulePackages()) {
            ApplicationContext ctx = pkg.getContext();
            if (ctx != null) {
                modules.put(pkg.getId(), new ContextInfo(MODULE_CONTEXT_PREFIX + pkg.getId(),
                        pkg.getName() + " (" + pkg.getIdWithVersion() + ")", ctx));
            }
        }
        contexts.addAll(modules.values());
        return contexts;
    }

    /**
     * Resolves a context by the identifier used in the selector, or {@code null} when it does not exist (any more).
     */
    public static ContextInfo getContext(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        for (ContextInfo info : getContexts()) {
            if (info.getId().equals(id)) {
                return info;
            }
        }
        return null;
    }

    static ApplicationContext getCoreContext() {
        SpringContextSingleton singleton = SpringContextSingleton.getInstance();
        return singleton != null && singleton.isInitialized() ? singleton.getContext() : null;
    }

    static List<JahiaTemplatesPackage> getModulePackages() {
        JahiaTemplateManagerService service = ServicesRegistry.getInstance().getJahiaTemplateManagerService();
        if (service == null) {
            return Collections.emptyList();
        }
        return new ArrayList<>(service.getTemplatePackageRegistry().getRegisteredModules().values());
    }

    /**
     * Returns the names of the singleton beans already instantiated in the context, sorted, minus the beans the
     * {@link SpringBeanEditorPolicy} denies. Only instantiated singletons are listed so that browsing never triggers
     * the creation of a lazy or prototype bean.
     */
    public static List<String> getBeanNames(ApplicationContext context) {
        if (!(context instanceof ConfigurableApplicationContext)) {
            return Collections.emptyList();
        }
        ConfigurableListableBeanFactory factory = ((ConfigurableApplicationContext) context).getBeanFactory();
        List<String> names = new ArrayList<>();
        for (String name : factory.getBeanDefinitionNames()) {
            BeanDefinition definition = factory.getBeanDefinition(name);
            if (!definition.isAbstract() && definition.isSingleton() && factory.containsSingleton(name)) {
                Object singleton = factory.getSingleton(name);
                if (!SpringBeanEditorPolicy.isBeanDenied(name, singleton == null ? null : singleton.getClass())) {
                    names.add(name);
                }
            }
        }
        Collections.sort(names, String.CASE_INSENSITIVE_ORDER);
        return names;
    }

    /**
     * Returns the bean instance, or {@code null} when the name is not one of {@link #getBeanNames(ApplicationContext)}.
     */
    public static Object getBean(ApplicationContext context, String beanName) {
        if (StringUtils.isEmpty(beanName) || !getBeanNames(context).contains(beanName)) {
            return null;
        }
        return context.getBean(beanName);
    }

    /**
     * Returns the merged Spring definition of the bean, or {@code null} when the context does not expose it.
     */
    public static BeanDefinition getBeanDefinition(ApplicationContext context, String beanName) {
        if (!(context instanceof ConfigurableApplicationContext) || StringUtils.isEmpty(beanName)) {
            return null;
        }
        ConfigurableListableBeanFactory factory = ((ConfigurableApplicationContext) context).getBeanFactory();
        return factory.containsBeanDefinition(beanName) ? factory.getMergedBeanDefinition(beanName) : null;
    }

    /**
     * Where the bean definition was declared (an XML file, most of the time), or {@code null} when unknown.
     */
    public static String getDefinitionResource(BeanDefinition definition) {
        return definition != null ? definition.getResourceDescription() : null;
    }

    /**
     * Tells whether the bean definition itself comes from an override file, that is one placed in the
     * {@code WEB-INF/etc/spring} folder or named {@code applicationcontext-override-*.xml}, rather than from the
     * product's own configuration.
     */
    public static boolean isOverrideResource(String resourceDescription) {
        if (resourceDescription == null) {
            return false;
        }
        String normalized = resourceDescription.replace('\\', '/');
        return normalized.contains("applicationcontext-override-") || normalized.contains("/etc/spring/");
    }

    /**
     * Lists the String and primitive properties of the bean, sorted by name, each annotated with what its Spring
     * definition configures and what the override store persists, so that the editor can tell where a value comes
     * from.
     *
     * @param bean       the bean instance
     * @param definition the bean's Spring definition, may be {@code null}
     * @param persisted  the persisted overrides of the bean (property name to value), may be {@code null}
     */
    public static List<BeanProperty> getEditableProperties(Object bean, BeanDefinition definition,
            Map<String, String> persisted) {
        List<BeanProperty> properties = getEditableProperties(bean);
        for (BeanProperty property : properties) {
            if (definition != null) {
                PropertyValue configured = definition.getPropertyValues().getPropertyValue(property.getName());
                if (configured != null) {
                    Object raw = configured.getValue();
                    if (raw instanceof TypedStringValue) {
                        property.configuredValue = ((TypedStringValue) raw).getValue();
                    } else if (raw instanceof String) {
                        property.configuredValue = (String) raw;
                    } else if (raw == null) {
                        property.configuredValue = null;
                    } else {
                        property.configuredByReference = true;
                    }
                }
            }
            if (persisted != null) {
                property.persistedValue = persisted.get(property.getName());
            }
            if (property.isSensitive()) {
                property.configuredValue = property.configuredValue == null ? null : SpringBeanEditorPolicy.MASK;
                property.persistedValue = property.persistedValue == null ? null : SpringBeanEditorPolicy.MASK;
            }
        }
        return properties;
    }

    /**
     * Tells whether values of this type are edited by the tool: {@link String}, primitives and their wrappers.
     */
    public static boolean isEditableType(Class<?> type) {
        if (type == null) {
            return false;
        }
        if (type == String.class || type.isPrimitive()) {
            return true;
        }
        return type == Boolean.class || type == Character.class || type == Byte.class || type == Short.class
                || type == Integer.class || type == Long.class || type == Float.class || type == Double.class;
    }

    /**
     * Lists the String and primitive JavaBean properties of the bean, sorted by name. Only accessors are considered:
     * a value is read through its getter and written through its setter, bare or private fields are never touched,
     * so what the editor shows and changes is exactly the public contract of the bean.
     */
    public static List<BeanProperty> getEditableProperties(Object bean) {
        Map<String, BeanProperty> properties = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (PropertyDescriptor descriptor : getPropertyDescriptors(bean.getClass())) {
            Class<?> type = descriptor.getPropertyType();
            if ("class".equals(descriptor.getName()) || !isEditableType(type)) {
                continue;
            }
            Method getter = descriptor.getReadMethod();
            Method setter = descriptor.getWriteMethod();
            boolean readable = getter != null;
            boolean writable = setter != null;
            String value = readable ? readValue(bean, getter) : null;
            properties.put(descriptor.getName(),
                    new BeanProperty(descriptor.getName(), type, value, readable, writable, setter != null, "accessor"));
        }
        return new ArrayList<>(properties.values());
    }

    /**
     * Turns what the editor form submitted for a property into the value to apply, or tells that nothing is to be
     * applied.
     * <ul>
     * <li>the null checkbox sets a non-primitive property to {@code null};</li>
     * <li>an empty text sets a wrapper (a non-primitive, non-String type) to {@code null}, since that is the only
     * way to render "no value" in a text field;</li>
     * <li>a value equal to the current one is skipped, so untouched setters are not re-invoked;</li>
     * <li>a property whose current value cannot be read is only written when a value was actually typed.</li>
     * </ul>
     *
     * @param property  the property as it was rendered
     * @param submitted the submitted text, never {@code null}
     * @param setNull   whether the null checkbox was checked
     * @return {@code true} when the property must be written with {@link #resolveSubmittedValue}'s companion value
     */
    public static boolean isChanged(BeanProperty property, String submitted, boolean setNull) {
        if (!property.isWritable()) {
            return false;
        }
        String newValue = resolveSubmittedValue(property, submitted, setNull);
        if (!property.isReadable()) {
            return setNull || !submitted.isEmpty();
        }
        return !Objects.equals(newValue, property.getValue());
    }

    /**
     * The value to apply for what the editor form submitted, following the rules of {@link #isChanged}.
     */
    public static String resolveSubmittedValue(BeanProperty property, String submitted, boolean setNull) {
        boolean wrapper = !property.isPrimitive() && property.getType() != String.class;
        if ((setNull && !property.isPrimitive()) || (wrapper && submitted.isEmpty())) {
            return null;
        }
        return submitted;
    }

    /**
     * Sets the property to the value parsed from {@code text} through its setter; a {@code null} text sets the
     * property to {@code null} (refused for a primitive).
     *
     * @throws IllegalArgumentException when the property is unknown, has no setter, is sensitive, or the text does
     *                                  not parse
     */
    public static void setProperty(Object bean, String propertyName, String text) {
        if (SpringBeanEditorPolicy.isSensitive(propertyName)) {
            throw new IllegalArgumentException("Property '" + propertyName + "' is sensitive and cannot be edited");
        }
        PropertyDescriptor descriptor = null;
        for (PropertyDescriptor candidate : getPropertyDescriptors(bean.getClass())) {
            if (candidate.getName().equals(propertyName) && isEditableType(candidate.getPropertyType())) {
                descriptor = candidate;
                break;
            }
        }
        if (descriptor == null) {
            throw new IllegalArgumentException("Unknown property '" + propertyName + "'");
        }
        Method setter = descriptor.getWriteMethod();
        if (setter == null) {
            throw new IllegalArgumentException("Property '" + propertyName + "' is read-only");
        }
        Object value = convert(text, descriptor.getPropertyType(), propertyName);
        try {
            setter.invoke(bean, value);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            throw new IllegalArgumentException("Setting '" + propertyName + "' failed: " + cause, cause);
        } catch (IllegalAccessException | RuntimeException e) {
            throw new IllegalArgumentException("Setting '" + propertyName + "' failed: " + e, e);
        }
    }

    /**
     * Parses the text into a value of the given String, primitive or wrapper type.
     *
     * @throws IllegalArgumentException when the text is not a valid literal of the type
     */
    static Object convert(String text, Class<?> type, String propertyName) {
        if (text == null) {
            if (type.isPrimitive()) {
                throw new IllegalArgumentException("Property '" + propertyName + "' is a primitive " + type.getName()
                        + " and cannot be set to null");
            }
            return null;
        }
        if (type == String.class) {
            return text;
        }
        String trimmed = text.trim();
        try {
            if (type == boolean.class || type == Boolean.class) {
                if ("true".equalsIgnoreCase(trimmed)) {
                    return Boolean.TRUE;
                }
                if ("false".equalsIgnoreCase(trimmed)) {
                    return Boolean.FALSE;
                }
                throw new IllegalArgumentException("expected true or false");
            }
            if (type == char.class || type == Character.class) {
                if (text.length() != 1) {
                    throw new IllegalArgumentException("expected a single character");
                }
                return text.charAt(0);
            }
            if (type == int.class || type == Integer.class) {
                return Integer.valueOf(trimmed);
            }
            if (type == long.class || type == Long.class) {
                return Long.valueOf(trimmed);
            }
            if (type == short.class || type == Short.class) {
                return Short.valueOf(trimmed);
            }
            if (type == byte.class || type == Byte.class) {
                return Byte.valueOf(trimmed);
            }
            if (type == double.class || type == Double.class) {
                return Double.valueOf(trimmed);
            }
            if (type == float.class || type == Float.class) {
                return Float.valueOf(trimmed);
            }
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid value '" + text + "' for property '" + propertyName + "' of type "
                    + type.getSimpleName() + (e instanceof NumberFormatException ? "" : ": " + e.getMessage()), e);
        }
        throw new IllegalArgumentException("Property '" + propertyName + "' has unsupported type " + type.getName());
    }

    private static PropertyDescriptor[] getPropertyDescriptors(Class<?> beanClass) {
        try {
            return Introspector.getBeanInfo(beanClass).getPropertyDescriptors();
        } catch (IntrospectionException e) {
            logger.warn("Unable to introspect {}", beanClass.getName(), e);
            return new PropertyDescriptor[0];
        }
    }

    private static String readValue(Object bean, Method getter) {
        try {
            Object value = getter.invoke(bean);
            return value != null ? String.valueOf(value) : null;
        } catch (InvocationTargetException | IllegalAccessException | RuntimeException e) {
            logger.debug("Unable to read property of {}", bean.getClass().getName(), e);
            return null;
        }
    }
}
