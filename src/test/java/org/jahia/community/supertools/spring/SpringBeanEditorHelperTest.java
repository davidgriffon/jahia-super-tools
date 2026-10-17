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
import org.jahia.community.supertools.spring.SpringBeanEditorHelper.ValueStatus;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.springframework.beans.MutablePropertyValues;
import org.springframework.beans.factory.config.RuntimeBeanReference;
import org.springframework.beans.factory.config.TypedStringValue;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.context.support.GenericApplicationContext;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

/**
 * Verifies how the Spring bean editor discovers beans and reads and writes their String and primitive values.
 */
public class SpringBeanEditorHelperTest {

    /** A bean shaped like typical Jahia services: accessors, write-only setters, bare fields, secrets and non-scalar values. */
    @SuppressWarnings("unused")
    public static class SampleBean {
        private String name = "initial";
        private int retries = 3;
        private Integer timeout;
        private boolean enabled = true;
        private Boolean flag;
        private long interval = 10L;
        private char separator = ',';
        private double ratio = 0.5d;
        private final String immutable = "fixed";
        private String hidden = "hidden";
        private String apiKey = "s3cr3t";
        private String password = "hunter2";
        private List<String> items = new ArrayList<>();
        private Map<String, String> mapping;
        private static String staticValue = "static";
        private int setterCalls;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
            setterCalls++;
        }

        public int getRetries() {
            return retries;
        }

        public void setRetries(int retries) {
            this.retries = retries;
        }

        // write-only: the value cannot be shown
        public void setTimeout(Integer timeout) {
            this.timeout = timeout;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public Boolean getFlag() {
            return flag;
        }

        public void setFlag(Boolean flag) {
            this.flag = flag;
        }

        // read-only accessor: the backing field is never written by the editor
        public long getInterval() {
            return interval;
        }

        public char getSeparator() {
            return separator;
        }

        public void setSeparator(char separator) {
            this.separator = separator;
        }

        public double getRatio() {
            return ratio;
        }

        public void setRatio(double ratio) {
            this.ratio = ratio;
        }

        public String getImmutable() {
            return immutable;
        }

        // derived value with no backing field: read-only
        public String getComputed() {
            return name + "/" + retries;
        }

        // secrets: shown masked, never editable
        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public List<String> getItems() {
            return items;
        }

        public void setItems(List<String> items) {
            this.items = items;
        }

        public void setRejected(String value) {
            throw new IllegalStateException("rejected by the bean");
        }

        public int getSetterCalls() {
            return setterCalls;
        }
    }

    private GenericApplicationContext context;
    private SampleBean bean;

    @Before
    public void setUp() {
        context = new GenericApplicationContext();
        context.registerBeanDefinition("sample", new RootBeanDefinition(SampleBean.class));
        RootBeanDefinition lazy = new RootBeanDefinition(SampleBean.class);
        lazy.setLazyInit(true);
        context.registerBeanDefinition("lazySample", lazy);
        RootBeanDefinition prototype = new RootBeanDefinition(SampleBean.class);
        prototype.setScope("prototype");
        context.registerBeanDefinition("prototypeSample", prototype);
        RootBeanDefinition abstractDefinition = new RootBeanDefinition(SampleBean.class);
        abstractDefinition.setAbstract(true);
        context.registerBeanDefinition("abstractSample", abstractDefinition);
        // beans the policy denies: by name, and by class name
        context.registerBeanDefinition("settingsBean", new RootBeanDefinition(SampleBean.class));
        context.registerBeanDefinition("myDataSource", new RootBeanDefinition(SampleBean.class));
        context.registerBeanDefinition("mailer", new RootBeanDefinition(FakeAuthenticationService.class));
        context.refresh();
        bean = context.getBean("sample", SampleBean.class);
    }

    /** Denied through its class name. */
    public static class FakeAuthenticationService {
        public String getRealmName() {
            return "x";
        }
    }

    @After
    public void tearDown() {
        context.close();
    }

    @Test
    public void listsOnlyInstantiatedSingletonsThePolicyAllows() {
        assertEquals(Arrays.asList("sample"), SpringBeanEditorHelper.getBeanNames(context));
        assertSame(bean, SpringBeanEditorHelper.getBean(context, "sample"));
        assertNull(SpringBeanEditorHelper.getBean(context, "lazySample"));
        assertNull(SpringBeanEditorHelper.getBean(context, "prototypeSample"));
        assertNull(SpringBeanEditorHelper.getBean(context, "abstractSample"));
        assertNull(SpringBeanEditorHelper.getBean(context, "unknown"));
        assertNull(SpringBeanEditorHelper.getBean(context, null));
        // denied beans are instantiated singletons, yet neither listed nor reachable
        assertTrue(context.getBeanFactory().containsSingleton("settingsBean"));
        assertNull(SpringBeanEditorHelper.getBean(context, "settingsBean"));
        assertNull(SpringBeanEditorHelper.getBean(context, "myDataSource"));
        assertNull(SpringBeanEditorHelper.getBean(context, "mailer"));
        // listing must not have triggered the lazy bean
        assertFalse(context.getBeanFactory().containsSingleton("lazySample"));
    }

    @Test
    public void deniesPlatformSecurityAndSecretBearingBeans() {
        for (String name : Arrays.asList("settingsBean", "dataSource", "jcrSessionFactory", "authPipeline", "licenseChecker",
                "passwordService", "oauthTokenStore", "shiroFilter")) {
            assertTrue(name, SpringBeanEditorPolicy.isBeanDenied(name, null));
        }
        assertTrue(SpringBeanEditorPolicy.isBeanDenied("x", FakeAuthenticationService.class));
        assertFalse(SpringBeanEditorPolicy.isBeanDenied("sample", SampleBean.class));
        assertFalse(SpringBeanEditorPolicy.isBeanDenied("ehCacheProvider", null));
    }

    @Test
    public void editableTypesAreStringPrimitivesAndWrappers() {
        for (Class<?> type : Arrays.asList(String.class, int.class, Integer.class, boolean.class, Boolean.class,
                long.class, Long.class, char.class, Character.class, double.class, Double.class, float.class,
                Float.class, short.class, Short.class, byte.class, Byte.class)) {
            assertTrue(type.getName(), SpringBeanEditorHelper.isEditableType(type));
        }
        for (Class<?> type : Arrays.asList(List.class, Map.class, Object.class, SampleBean.class, String[].class,
                int[].class, null)) {
            assertFalse(String.valueOf(type), SpringBeanEditorHelper.isEditableType(type));
        }
    }

    @Test
    public void listsStringAndPrimitiveAccessorPropertiesOnly() {
        List<BeanProperty> properties = SpringBeanEditorHelper.getEditableProperties(bean);
        List<String> names = properties.stream().map(BeanProperty::getName).collect(Collectors.toList());
        assertEquals(Arrays.asList("apiKey", "computed", "enabled", "flag", "immutable", "interval", "name", "password",
                "ratio", "rejected", "retries", "separator", "setterCalls", "timeout"), names);
        // bare fields are not bean properties: never listed, never read
        assertFalse(names.contains("hidden"));
        assertFalse(names.contains("items"));
        assertFalse(names.contains("mapping"));
        assertFalse(names.contains("staticValue"));
        assertFalse(names.contains("class"));

        // a setter without getter is writable but its value cannot be shown
        BeanProperty rejected = byName().get("rejected");
        assertFalse(rejected.isReadable());
        assertTrue(rejected.isWritable());
        assertNull(rejected.getValue());
    }

    @Test
    public void leavesJdkInternalsOut() {
        // a bean that is a plain JDK collection: only what its accessors offer, nothing writable
        for (BeanProperty property : SpringBeanEditorHelper.getEditableProperties(new java.util.LinkedHashMap<>())) {
            assertEquals(property.getName(), "accessor", property.getSource());
            assertFalse(property.getName(), property.isWritable());
        }

        // a bean extending a JDK class with a private field: the field is not a property
        class Counter extends java.util.ArrayList<String> {
            @SuppressWarnings("unused")
            private int hits = 2;
        }
        List<String> names = SpringBeanEditorHelper.getEditableProperties(new Counter()).stream()
                .map(BeanProperty::getName).collect(Collectors.toList());
        assertFalse(names.contains("hits"));
    }

    @Test
    public void describesHowEachPropertyIsReached() {
        Map<String, BeanProperty> properties = byName();

        BeanProperty name = properties.get("name");
        assertEquals("initial", name.getValue());
        assertEquals(String.class, name.getType());
        assertEquals("String", name.getTypeName());
        assertTrue(name.isReadable());
        assertTrue(name.isWritable());
        assertFalse(name.isPrimitive());
        assertEquals("accessor", name.getSource());

        // write-only setter: writable, value unknown
        BeanProperty timeout = properties.get("timeout");
        assertFalse(timeout.isReadable());
        assertTrue(timeout.isWritable());
        assertNull(timeout.getValue());

        // read-only getter: shown, never written (the backing field is not touched)
        BeanProperty interval = properties.get("interval");
        assertEquals("10", interval.getValue());
        assertFalse(interval.isWritable());
        assertTrue(interval.isPrimitive());

        BeanProperty immutable = properties.get("immutable");
        assertEquals("fixed", immutable.getValue());
        assertFalse(immutable.isWritable());

        BeanProperty computed = properties.get("computed");
        assertEquals("initial/3", computed.getValue());
        assertTrue(computed.isReadable());
        assertFalse(computed.isWritable());

        assertTrue(properties.get("enabled").isBoolean());
        assertTrue(properties.get("flag").isBoolean());
        assertFalse(properties.get("retries").isBoolean());
    }

    @Test
    public void masksSensitivePropertiesAndRefusesToEditThem() {
        for (String name : Arrays.asList("password", "dbPassword", "passwd", "apiKey", "clientSecret", "accessToken", "salt", "credentials")) {
            assertTrue(name, SpringBeanEditorPolicy.isSensitive(name));
        }
        for (String name : Arrays.asList("name", "retries", "timeout", "enabled")) {
            assertFalse(name, SpringBeanEditorPolicy.isSensitive(name));
        }

        Map<String, BeanProperty> properties = byName();
        for (String name : Arrays.asList("apiKey", "password")) {
            BeanProperty property = properties.get(name);
            assertTrue(name, property.isSensitive());
            assertEquals(name, SpringBeanEditorPolicy.MASK, property.getValue());
            assertFalse(name, property.isWritable());
            assertFalse(name, property.isPersistable());
        }
        assertRejected("password", "newpass", "sensitive");
        assertEquals("hunter2", bean.getPassword());

        // the configuration and the override file are masked too, and the status does not leak a comparison
        MutablePropertyValues configured = new MutablePropertyValues();
        configured.add("apiKey", "configured-key");
        Map<String, String> persisted = new HashMap<>();
        persisted.put("password", "persisted-pass");
        Map<String, BeanProperty> withSources = SpringBeanEditorHelper.getEditableProperties(bean,
                new RootBeanDefinition(SampleBean.class, null, configured), persisted).stream()
                .collect(Collectors.toMap(BeanProperty::getName, p -> p));
        assertEquals(SpringBeanEditorPolicy.MASK, withSources.get("apiKey").getConfiguredValue());
        assertEquals(ValueStatus.CONFIGURED, withSources.get("apiKey").getStatus());
        assertEquals(SpringBeanEditorPolicy.MASK, withSources.get("password").getPersistedValue());
        assertEquals(ValueStatus.PERSISTED, withSources.get("password").getStatus());
        assertEquals(ValueStatus.DEFAULT, withSources.get("name").getStatus());
    }

    @Test
    public void writesThroughTheSetter() {
        SpringBeanEditorHelper.setProperty(bean, "name", "changed");
        assertEquals("changed", bean.getName());
        assertEquals(1, bean.getSetterCalls());

        SpringBeanEditorHelper.setProperty(bean, "retries", " 7 ");
        assertEquals(7, bean.getRetries());
        SpringBeanEditorHelper.setProperty(bean, "enabled", "false");
        assertFalse(bean.isEnabled());
        SpringBeanEditorHelper.setProperty(bean, "flag", "TRUE");
        assertEquals(Boolean.TRUE, bean.getFlag());
        SpringBeanEditorHelper.setProperty(bean, "timeout", "30");
        assertEquals(Integer.valueOf(30), bean.timeout);
        SpringBeanEditorHelper.setProperty(bean, "separator", ";");
        assertEquals(';', bean.getSeparator());
        SpringBeanEditorHelper.setProperty(bean, "ratio", "0.25");
        assertEquals(0.25d, bean.getRatio(), 0d);
    }

    @Test
    public void neverWritesAField() {
        assertRejected("interval", "42", "read-only");
        assertEquals(10L, bean.getInterval());
        assertRejected("hidden", "visible", "Unknown property");
        assertEquals("hidden", bean.hidden);
    }

    @Test
    public void setsNullOnNonPrimitiveProperties() {
        SpringBeanEditorHelper.setProperty(bean, "name", null);
        assertNull(bean.getName());
        SpringBeanEditorHelper.setProperty(bean, "flag", "true");
        SpringBeanEditorHelper.setProperty(bean, "flag", null);
        assertNull(bean.getFlag());
        assertNull(byName().get("name").getValue());
    }

    @Test
    public void refusesNullOnPrimitiveProperties() {
        assertRejected("retries", null, "cannot be set to null");
        assertEquals(3, bean.getRetries());
    }

    @Test
    public void refusesInvalidLiterals() {
        assertRejected("retries", "many", "Invalid value 'many'");
        assertRejected("enabled", "yes", "expected true or false");
        assertRejected("separator", "ab", "expected a single character");
        assertRejected("ratio", "1,5", "Invalid value '1,5'");
        assertEquals(3, bean.getRetries());
        assertTrue(bean.isEnabled());
        assertEquals(',', bean.getSeparator());
        assertEquals(0.5d, bean.getRatio(), 0d);
    }

    @Test
    public void refusesReadOnlyAndUnknownProperties() {
        assertRejected("immutable", "other", "read-only");
        assertRejected("computed", "other", "read-only");
        assertRejected("items", "a,b", "Unknown property");
        assertRejected("staticValue", "other", "Unknown property");
        assertRejected("doesNotExist", "x", "Unknown property");
        assertEquals("fixed", bean.getImmutable());
        assertEquals("static", SampleBean.staticValue);
    }

    @Test
    public void reportsAFailingSetter() {
        assertRejected("rejected", "x", "rejected by the bean");
    }

    @Test
    public void tellsWhereEachValueComesFrom() {
        // a definition configuring some properties with literals, one with a reference
        MutablePropertyValues configured = new MutablePropertyValues();
        configured.add("name", new TypedStringValue("initial"));
        configured.add("retries", "3");
        configured.add("interval", "10");
        configured.add("timeout", new RuntimeBeanReference("someOtherBean"));
        RootBeanDefinition definition = new RootBeanDefinition(SampleBean.class, null, configured);
        definition.setResourceDescription("file [/jahia/WEB-INF/etc/spring/applicationcontext-override-custom.xml]");

        Map<String, String> persisted = new HashMap<>();
        persisted.put("interval", "10");
        persisted.put("ratio", "0.75");

        Map<String, BeanProperty> properties = SpringBeanEditorHelper.getEditableProperties(bean, definition, persisted)
                .stream().collect(Collectors.toMap(BeanProperty::getName, p -> p));

        assertEquals(ValueStatus.CONFIGURED, properties.get("name").getStatus());
        assertEquals("initial", properties.get("name").getConfiguredValue());
        assertEquals(ValueStatus.CONFIGURED, properties.get("retries").getStatus());
        assertEquals(ValueStatus.DEFAULT, properties.get("enabled").getStatus());
        assertNull(properties.get("enabled").getConfiguredValue());
        assertEquals(ValueStatus.PERSISTED, properties.get("interval").getStatus());
        assertEquals("10", properties.get("interval").getPersistedValue());
        assertEquals(ValueStatus.PERSISTED_PENDING, properties.get("ratio").getStatus());
        assertEquals("0.75", properties.get("ratio").getPersistedValue());
        assertTrue(properties.get("timeout").isConfiguredByReference());
        assertEquals(ValueStatus.CONFIGURED, properties.get("timeout").getStatus());

        // a literal is compared the way its type renders it: 0.5 configured as ".5" or "0.50" is the same double
        MutablePropertyValues numeric = new MutablePropertyValues();
        numeric.add("ratio", "0.50");
        numeric.add("interval", " 10 ");
        numeric.add("enabled", "TRUE");
        Map<String, String> numericPersisted = new HashMap<>();
        numericPersisted.put("retries", "03");
        Map<String, BeanProperty> rendered = SpringBeanEditorHelper.getEditableProperties(bean,
                new RootBeanDefinition(SampleBean.class, null, numeric), numericPersisted).stream()
                .collect(Collectors.toMap(BeanProperty::getName, p -> p));
        assertEquals(ValueStatus.CONFIGURED, rendered.get("ratio").getStatus());
        assertEquals(ValueStatus.CONFIGURED, rendered.get("interval").getStatus());
        assertEquals(ValueStatus.CONFIGURED, rendered.get("enabled").getStatus());
        assertEquals(ValueStatus.PERSISTED, rendered.get("retries").getStatus());

        // an unreadable property is never reported as differing from what configures it
        MutablePropertyValues rejectedConfigured = new MutablePropertyValues();
        rejectedConfigured.add("rejected", "configured");
        Map<String, String> rejectedPersisted = new HashMap<>();
        rejectedPersisted.put("rejected", "persisted");
        Map<String, BeanProperty> unreadable = SpringBeanEditorHelper.getEditableProperties(bean,
                new RootBeanDefinition(SampleBean.class, null, rejectedConfigured), null).stream()
                .collect(Collectors.toMap(BeanProperty::getName, p -> p));
        assertFalse(unreadable.get("rejected").isReadable());
        assertEquals(ValueStatus.CONFIGURED, unreadable.get("rejected").getStatus());
        unreadable = SpringBeanEditorHelper.getEditableProperties(bean, null, rejectedPersisted).stream()
                .collect(Collectors.toMap(BeanProperty::getName, p -> p));
        assertEquals(ValueStatus.PERSISTED, unreadable.get("rejected").getStatus());

        // only a property with a setter can be persisted through a Spring override
        assertTrue(properties.get("name").isPersistable());
        assertFalse(properties.get("interval").isPersistable());
        assertFalse(properties.get("computed").isPersistable());

        // a change in memory shows as such against the configuration
        SpringBeanEditorHelper.setProperty(bean, "name", "edited");
        properties = SpringBeanEditorHelper.getEditableProperties(bean, definition, persisted).stream()
                .collect(Collectors.toMap(BeanProperty::getName, p -> p));
        assertEquals(ValueStatus.MEMORY, properties.get("name").getStatus());
        assertEquals("initial", properties.get("name").getConfiguredValue());

        // without a definition or a store, everything is a runtime default
        for (BeanProperty property : SpringBeanEditorHelper.getEditableProperties(bean, null, null)) {
            assertEquals(property.getName(), ValueStatus.DEFAULT, property.getStatus());
        }

        assertTrue(SpringBeanEditorHelper.isOverrideResource(definition.getResourceDescription()));
        assertTrue(SpringBeanEditorHelper.isOverrideResource("URL [jar:file:/x.jar!/org/jahia/defaults/config/spring/applicationcontext-override-cache.xml]"));
        assertFalse(SpringBeanEditorHelper.isOverrideResource("URL [jar:file:/x.jar!/org/jahia/defaults/config/spring/applicationcontext-cache.xml]"));
        assertFalse(SpringBeanEditorHelper.isOverrideResource(null));
    }

    @Test
    public void exposesTheDefinitionOfAContextBean() {
        assertNotNull(SpringBeanEditorHelper.getBeanDefinition(context, "sample"));
        assertNull(SpringBeanEditorHelper.getBeanDefinition(context, "unknown"));
        assertNull(SpringBeanEditorHelper.getBeanDefinition(context, null));
        assertNull(SpringBeanEditorHelper.getDefinitionResource(null));
    }

    @Test
    public void appliesOnlyEditedValues() {
        Map<String, BeanProperty> properties = byName();

        // unchanged text: nothing to apply
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("name"), "initial", false));
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("name"), "other", false));
        assertEquals("other", SpringBeanEditorHelper.resolveSubmittedValue(properties.get("name"), "other", false));

        // the null checkbox on a String: applied as null, even when the text field still shows the current value
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("name"), "initial", true));
        assertNull(SpringBeanEditorHelper.resolveSubmittedValue(properties.get("name"), "initial", true));

        // an empty String is a value, not null
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("name"), "", false));
        assertEquals("", SpringBeanEditorHelper.resolveSubmittedValue(properties.get("name"), "", false));

        // a wrapper rendered empty because it is null stays untouched when submitted empty
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("flag"), "", false));
        assertNull(SpringBeanEditorHelper.resolveSubmittedValue(properties.get("flag"), "", false));
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("timeout"), "", false));
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("timeout"), "5", false));

        // the null checkbox is ignored on a primitive, the text is what counts
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("retries"), "3", true));
        assertEquals("3", SpringBeanEditorHelper.resolveSubmittedValue(properties.get("retries"), "3", true));
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("retries"), "4", true));

        // read-only and sensitive: never applied
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("immutable"), "other", false));
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("computed"), "other", true));
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("password"), "other", false));

        // not readable: only applied when something was typed or null was requested
        assertFalse(SpringBeanEditorHelper.isChanged(properties.get("rejected"), "", false));
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("rejected"), "x", false));
        assertTrue(SpringBeanEditorHelper.isChanged(properties.get("rejected"), "", true));
    }

    private Map<String, BeanProperty> byName() {
        return SpringBeanEditorHelper.getEditableProperties(bean).stream()
                .collect(Collectors.toMap(BeanProperty::getName, p -> p));
    }

    private void assertRejected(String property, String value, String expectedMessagePart) {
        try {
            SpringBeanEditorHelper.setProperty(bean, property, value);
            fail("expected setting " + property + " to " + value + " to be rejected");
        } catch (IllegalArgumentException e) {
            assertTrue(e.getMessage(), e.getMessage().contains(expectedMessagePart));
        }
    }
}
