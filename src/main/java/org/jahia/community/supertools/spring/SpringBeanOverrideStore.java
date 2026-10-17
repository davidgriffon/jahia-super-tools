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

import org.jahia.settings.SettingsBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.Map;
import java.util.TreeMap;

/**
 * The Spring override file the bean editor maintains to make a value change survive a restart.
 * <p>
 * Jahia's core context loads every {@code applicationcontext-override-*.xml} found under {@code WEB-INF/etc/spring}
 * after its own configuration. The file written here declares a single Spring {@code PropertyOverrideConfigurer}:
 * a bean factory post-processor that, at startup, replaces the {@code <bean>.<property>} values it lists on the bean
 * definitions before the beans are created. Only properties with a setter can be overridden this way, and a value
 * can never be {@code null} (removing the entry restores the configured value instead).
 * <p>
 * Module Spring contexts do not read this folder: they only load the XML files packaged in their bundle. The store
 * is therefore only offered for the core context.
 */
public class SpringBeanOverrideStore {

    private static final Logger logger = LoggerFactory.getLogger(SpringBeanOverrideStore.class);

    /** File name, matching the {@code applicationcontext-override-*.xml} pattern of the core context. */
    public static final String FILE_NAME = "applicationcontext-override-tools-bean-editor.xml";

    /** Id of the configurer bean, fixed so that a file loaded twice (it also matches applicationcontext-*.xml) yields one bean. */
    public static final String CONFIGURER_BEAN_ID = "toolsSpringBeanEditorOverrides";

    /**
     * Separator between the bean name and the property name in a key. Spring's default dot would split bean names
     * containing dots (such as {@code org.jahia.modules.default.ModuleRegistry}), and Spring assumes a
     * single-character separator when it splits the key, so a multi-character one is not an option either.
     */
    public static final String SEPARATOR = "|";

    private static final String BEANS_NS = "http://www.springframework.org/schema/beans";
    private static final String CONFIGURER_CLASS = "org.springframework.beans.factory.config.PropertyOverrideConfigurer";

    private final File file;

    public SpringBeanOverrideStore(File file) {
        this.file = file;
    }

    /**
     * The store of the Jahia core context: {@code WEB-INF/etc/spring/applicationcontext-override-tools-bean-editor.xml}.
     */
    public static SpringBeanOverrideStore forCoreContext() {
        return new SpringBeanOverrideStore(new File(new File(SettingsBean.getInstance().getJahiaEtcDiskPath(), "spring"), FILE_NAME));
    }

    public File getFile() {
        return file;
    }

    public boolean exists() {
        return file.isFile();
    }

    /**
     * Reads the persisted overrides: bean name to (property name to value). Empty when the file does not exist.
     *
     * @throws IllegalStateException when the file exists but cannot be parsed
     */
    public synchronized Map<String, Map<String, String>> read() {
        Map<String, Map<String, String>> overrides = new TreeMap<>();
        if (!file.isFile()) {
            return overrides;
        }
        try {
            Document document = newDocumentBuilder().parse(file);
            NodeList props = document.getElementsByTagNameNS(BEANS_NS, "prop");
            for (int i = 0; i < props.getLength(); i++) {
                Element prop = (Element) props.item(i);
                String key = prop.getAttribute("key");
                int separator = key.indexOf(SEPARATOR);
                if (separator <= 0) {
                    logger.warn("Ignoring override key '{}' in {}: expected <bean>{}<property>", key, file, SEPARATOR);
                    continue;
                }
                overrides.computeIfAbsent(key.substring(0, separator), k -> new TreeMap<>())
                        .put(key.substring(separator + SEPARATOR.length()), prop.getTextContent());
            }
            return overrides;
        } catch (Exception e) {
            throw new IllegalStateException("Unable to read the Spring override file " + file + ": " + e.getMessage(), e);
        }
    }

    /**
     * The overrides persisted for one bean, keyed by property name. Empty when there are none.
     */
    public Map<String, String> read(String beanName) {
        Map<String, String> forBean = read().get(beanName);
        return forBean != null ? forBean : Collections.emptyMap();
    }

    /**
     * Persists a value for the property, replacing any previous one.
     *
     * @throws IllegalArgumentException when the value is {@code null}: an override cannot express null
     */
    public synchronized void set(String beanName, String propertyName, String value) {
        if (value == null) {
            throw new IllegalArgumentException("A Spring override cannot set '" + beanName + "." + propertyName
                    + "' to null; remove the override to restore the configured value instead");
        }
        Map<String, Map<String, String>> overrides = read();
        overrides.computeIfAbsent(beanName, k -> new TreeMap<>()).put(propertyName, value);
        write(overrides);
    }

    /**
     * Removes the persisted value for the property, if any; the file is deleted once it holds nothing.
     *
     * @return whether an override was removed
     */
    public synchronized boolean remove(String beanName, String propertyName) {
        Map<String, Map<String, String>> overrides = read();
        Map<String, String> forBean = overrides.get(beanName);
        if (forBean == null || forBean.remove(propertyName) == null) {
            return false;
        }
        if (forBean.isEmpty()) {
            overrides.remove(beanName);
        }
        write(overrides);
        return true;
    }

    private void write(Map<String, Map<String, String>> overrides) {
        try {
            if (overrides.isEmpty()) {
                Files.deleteIfExists(file.toPath());
                return;
            }
            Files.createDirectories(file.toPath().getParent());
            File temp = new File(file.getParentFile(), file.getName() + ".tmp");
            Transformer transformer = TransformerFactory.newInstance().newTransformer();
            transformer.setOutputProperty(OutputKeys.INDENT, "yes");
            transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "4");
            transformer.transform(new DOMSource(toDocument(overrides)), new StreamResult(temp));
            Files.move(temp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to write the Spring override file " + file, e);
        } catch (TransformerException | ParserConfigurationException e) {
            throw new IllegalStateException("Unable to write the Spring override file " + file, e);
        }
    }

    private Document toDocument(Map<String, Map<String, String>> overrides) throws ParserConfigurationException {
        Document document = newDocumentBuilder().newDocument();
        Element beans = document.createElementNS(BEANS_NS, "beans");
        beans.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns:xsi", XMLConstants.W3C_XML_SCHEMA_INSTANCE_NS_URI);
        beans.setAttributeNS(XMLConstants.W3C_XML_SCHEMA_INSTANCE_NS_URI, "xsi:schemaLocation",
                BEANS_NS + " " + BEANS_NS + "/spring-beans.xsd");
        document.appendChild(beans);
        beans.appendChild(document.createComment(" Generated by the Support Tools Spring bean editor. Each entry sets one bean"
                + " property at startup, before the bean is created; edit or remove entries from the bean editor. "));

        Element bean = document.createElementNS(BEANS_NS, "bean");
        bean.setAttribute("id", CONFIGURER_BEAN_ID);
        bean.setAttribute("class", CONFIGURER_CLASS);
        beans.appendChild(bean);
        bean.appendChild(property(document, "beanNameSeparator", SEPARATOR));
        bean.appendChild(property(document, "ignoreInvalidKeys", "true"));

        Element properties = document.createElementNS(BEANS_NS, "property");
        properties.setAttribute("name", "properties");
        bean.appendChild(properties);
        Element props = document.createElementNS(BEANS_NS, "props");
        properties.appendChild(props);
        for (Map.Entry<String, Map<String, String>> forBean : overrides.entrySet()) {
            for (Map.Entry<String, String> entry : forBean.getValue().entrySet()) {
                Element prop = document.createElementNS(BEANS_NS, "prop");
                prop.setAttribute("key", forBean.getKey() + SEPARATOR + entry.getKey());
                prop.setTextContent(entry.getValue());
                props.appendChild(prop);
            }
        }
        return document;
    }

    private static Element property(Document document, String name, String value) {
        Element property = document.createElementNS(BEANS_NS, "property");
        property.setAttribute("name", name);
        property.setAttribute("value", value);
        return property;
    }

    private static DocumentBuilder newDocumentBuilder() throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder();
    }
}
