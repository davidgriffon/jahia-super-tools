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

import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.springframework.beans.MutablePropertyValues;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.beans.factory.xml.XmlBeanDefinitionReader;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.core.io.FileSystemResource;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

/**
 * Verifies the Spring override file the bean editor writes: its round trip, and above all that Spring applies it
 * to a bean definition the way the core context will at startup.
 */
public class SpringBeanOverrideStoreTest {

    @Rule
    public TemporaryFolder folder = new TemporaryFolder();

    private File file;
    private SpringBeanOverrideStore store;

    @Before
    public void setUp() {
        file = new File(new File(folder.getRoot(), "spring"), SpringBeanOverrideStore.FILE_NAME);
        store = new SpringBeanOverrideStore(file);
    }

    @Test
    public void startsEmptyAndCreatesTheFileOnFirstWrite() {
        assertFalse(store.exists());
        assertTrue(store.read().isEmpty());
        assertTrue(store.read("sample").isEmpty());

        store.set("sample", "name", "persisted");
        assertTrue(store.exists());
        assertEquals("persisted", store.read("sample").get("name"));
    }

    @Test
    public void keepsOneValuePerBeanAndProperty() {
        store.set("sample", "name", "first");
        store.set("sample", "retries", "7");
        store.set("org.jahia.other.Bean", "name", "dotted bean names are kept whole");
        store.set("sample", "name", "second");

        Map<String, Map<String, String>> all = store.read();
        assertEquals(2, all.size());
        assertEquals("second", all.get("sample").get("name"));
        assertEquals("7", all.get("sample").get("retries"));
        assertEquals("dotted bean names are kept whole", all.get("org.jahia.other.Bean").get("name"));
    }

    @Test
    public void escapesMarkupInValues() throws Exception {
        String tricky = "<b>&\"quoted\"</b> é ${placeholder}";
        store.set("sample", "name", tricky);
        assertEquals(tricky, store.read("sample").get("name"));
        String xml = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        assertTrue(xml, xml.contains("&lt;b&gt;"));
    }

    @Test
    public void removesEntriesAndDeletesAnEmptyFile() {
        store.set("sample", "name", "x");
        store.set("sample", "retries", "1");
        assertFalse(store.remove("sample", "unknown"));
        assertFalse(store.remove("other", "name"));
        assertTrue(store.remove("sample", "name"));
        assertTrue(store.exists());
        assertNull(store.read("sample").get("name"));
        assertTrue(store.remove("sample", "retries"));
        assertFalse("an empty override file leaves no trace", store.exists());
        assertTrue(store.read().isEmpty());
    }

    @Test
    public void refusesNull() {
        try {
            store.set("sample", "name", null);
            fail("null cannot be expressed by a property override");
        } catch (IllegalArgumentException e) {
            assertTrue(e.getMessage(), e.getMessage().contains("null"));
        }
        assertFalse(store.exists());
    }

    @Test
    public void reportsAnUnreadableFile() throws Exception {
        Files.createDirectories(file.toPath().getParent());
        Files.write(file.toPath(), "<beans>not closed".getBytes(StandardCharsets.UTF_8));
        try {
            store.read();
            fail("a corrupt file must be reported, not silently ignored");
        } catch (IllegalStateException e) {
            assertTrue(e.getMessage(), e.getMessage().contains(file.getName()));
        }
    }

    @Test
    public void springAppliesTheFileToBeanDefinitionsAtStartup() {
        store.set("sample", "name", "from the override file");
        store.set("sample", "retries", "42");
        store.set("sample", "enabled", "false");
        store.set("org.jahia.dotted.sample", "name", "dotted");
        // an entry for a bean that no longer exists must not break the startup
        store.set("vanished", "name", "stale");

        try (GenericApplicationContext context = new GenericApplicationContext()) {
            MutablePropertyValues configured = new MutablePropertyValues();
            configured.add("name", "from the configuration");
            configured.add("retries", "3");
            context.registerBeanDefinition("sample", new RootBeanDefinition(SpringBeanEditorHelperTest.SampleBean.class, null, configured));
            context.registerBeanDefinition("org.jahia.dotted.sample", new RootBeanDefinition(SpringBeanEditorHelperTest.SampleBean.class));
            context.registerBeanDefinition("untouched", new RootBeanDefinition(SpringBeanEditorHelperTest.SampleBean.class));
            new XmlBeanDefinitionReader(context).loadBeanDefinitions(new FileSystemResource(file));
            context.refresh();

            SpringBeanEditorHelperTest.SampleBean sample = context.getBean("sample", SpringBeanEditorHelperTest.SampleBean.class);
            assertEquals("from the override file", sample.getName());
            assertEquals(42, sample.getRetries());
            assertFalse(sample.isEnabled());
            assertEquals("dotted", context.getBean("org.jahia.dotted.sample", SpringBeanEditorHelperTest.SampleBean.class).getName());
            assertEquals("initial", context.getBean("untouched", SpringBeanEditorHelperTest.SampleBean.class).getName());
            assertTrue(context.containsBean(SpringBeanOverrideStore.CONFIGURER_BEAN_ID));
        }
    }

    @Test
    public void loadingTheFileTwiceYieldsASingleConfigurer() {
        // the core context matches the file with both applicationcontext-*.xml and applicationcontext-override-*.xml
        store.set("sample", "retries", "5");
        try (GenericApplicationContext context = new GenericApplicationContext()) {
            context.registerBeanDefinition("sample", new RootBeanDefinition(SpringBeanEditorHelperTest.SampleBean.class));
            XmlBeanDefinitionReader reader = new XmlBeanDefinitionReader(context);
            reader.loadBeanDefinitions(new FileSystemResource(file));
            reader.loadBeanDefinitions(new FileSystemResource(file));
            context.refresh();
            assertEquals(1, context.getBeanNamesForType(
                    org.springframework.beans.factory.config.PropertyOverrideConfigurer.class).length);
            assertEquals(5, context.getBean("sample", SpringBeanEditorHelperTest.SampleBean.class).getRetries());
        }
    }
}
