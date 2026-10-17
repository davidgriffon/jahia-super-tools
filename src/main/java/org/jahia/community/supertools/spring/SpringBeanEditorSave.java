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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanDefinition;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Applies one "save" of the bean editor: the edited values, the per-property actions (restore the configured value,
 * persist the current value, remove the persisted override) and, in persist mode, the override file entries.
 * <p>
 * The submitted form is read through a parameter accessor so that the same logic serves the JSP page and the JSON
 * API. Parameter names, all suffixed with the property name:
 * <ul>
 * <li>{@code prop_} the submitted text, {@code null_} the null checkbox;</li>
 * <li>{@code restore_} puts the value of the Spring definition back and drops the override;</li>
 * <li>{@code persist_} writes the value currently in memory to the override file;</li>
 * <li>{@code unpersist_} removes the override entry, keeping the value in memory.</li>
 * </ul>
 */
public final class SpringBeanEditorSave {

    /** Every change is traced here: who, which context, which bean, which property, from what to what. */
    private static final Logger audit = LoggerFactory.getLogger(SpringBeanEditorSave.class);

    /** What one save did, property names per outcome, plus the messages to show. */
    public static final class Result {
        private final List<String> changed = new ArrayList<>();
        private final List<String> restored = new ArrayList<>();
        private final List<String> persisted = new ArrayList<>();
        private final List<String> unpersisted = new ArrayList<>();
        private final List<String> notices = new ArrayList<>();
        private final List<String> errors = new ArrayList<>();

        public List<String> getChanged() {
            return changed;
        }

        public List<String> getRestored() {
            return restored;
        }

        public List<String> getPersisted() {
            return persisted;
        }

        public List<String> getUnpersisted() {
            return unpersisted;
        }

        public List<String> getNotices() {
            return notices;
        }

        public List<String> getErrors() {
            return errors;
        }

        public boolean isEmpty() {
            return changed.isEmpty() && restored.isEmpty() && persisted.isEmpty() && unpersisted.isEmpty()
                    && errors.isEmpty();
        }
    }

    private SpringBeanEditorSave() {
        // utility class
    }

    /**
     * @param bean       the bean to edit
     * @param beanName   its name, used as the override file key
     * @param definition its Spring definition, may be {@code null}
     * @param store      the override store of the context, {@code null} when the context cannot persist
     * @param persist    whether edited values are also written to the override file
     * @param parameter  the submitted parameters, {@code null} for an absent one
     * @param actor      who performs the change, for the audit log
     * @param contextId  which Spring context, for the audit log
     */
    public static Result apply(Object bean, String beanName, BeanDefinition definition, SpringBeanOverrideStore store,
            boolean persist, Function<String, String> parameter, String actor, String contextId) {
        Result result = new Result();
        Map<String, String> persistedForBean = store != null ? store.read(beanName) : null;
        for (BeanProperty property : SpringBeanEditorHelper.getEditableProperties(bean, definition, persistedForBean)) {
            String name = property.getName();
            if (store != null && parameter.apply("unpersist_" + name) != null) {
                try {
                    if (store.remove(beanName, name)) {
                        result.unpersisted.add(name);
                        audit.info("Spring bean editor: {} removed the persisted override of {}.{} (context {})", actor, beanName, name, contextId);
                    }
                } catch (RuntimeException e) {
                    result.errors.add(e.getMessage());
                }
            }
            if (!property.isWritable()) {
                continue;
            }
            if (parameter.apply("restore_" + name) != null && property.getConfiguredValue() != null) {
                try {
                    SpringBeanEditorHelper.setProperty(bean, name, property.getConfiguredValue());
                    result.restored.add(name);
                    audit.info("Spring bean editor: {} restored {}.{} (context {}) from '{}' to the configured '{}'", actor, beanName, name, contextId,
                            property.getValue(), property.getConfiguredValue());
                    if (store != null && property.getPersistedValue() != null && store.remove(beanName, name)) {
                        result.unpersisted.add(name);
                        audit.info("Spring bean editor: {} removed the persisted override of {}.{} (context {})", actor, beanName, name, contextId);
                    }
                } catch (RuntimeException e) {
                    result.errors.add(e.getMessage());
                }
                continue;
            }
            String submitted = parameter.apply("prop_" + name);
            boolean setNull = parameter.apply("null_" + name) != null;
            boolean persistCurrent = store != null && parameter.apply("persist_" + name) != null;
            // Only touch the properties whose value was actually edited, so untouched setters are not re-invoked.
            boolean edited = submitted != null && SpringBeanEditorHelper.isChanged(property, submitted, setNull);
            if (!edited && !persistCurrent) {
                continue;
            }
            String newValue = property.getValue();
            if (edited) {
                newValue = SpringBeanEditorHelper.resolveSubmittedValue(property, submitted, setNull);
                try {
                    SpringBeanEditorHelper.setProperty(bean, name, newValue);
                    result.changed.add(name);
                    audit.info("Spring bean editor: {} changed {}.{} (context {}) in memory from '{}' to '{}'", actor, beanName, name, contextId,
                            property.getValue(), newValue);
                } catch (IllegalArgumentException e) {
                    result.errors.add(e.getMessage());
                    continue;
                }
            }
            if (!(edited && persist && store != null) && !persistCurrent) {
                continue;
            }
            if (!property.isPersistable()) {
                result.notices.add("'" + name + "' was changed in memory only: it has no setter, so a Spring override cannot set it.");
            } else if (newValue == null) {
                try {
                    if (store.remove(beanName, name)) {
                        result.unpersisted.add(name);
                    }
                    result.notices.add("'" + name + "' was set to null in memory only: a Spring override cannot express null, so its persisted override was removed instead.");
                } catch (RuntimeException e) {
                    result.errors.add(e.getMessage());
                }
            } else {
                try {
                    store.set(beanName, name, newValue);
                    result.persisted.add(name);
                    audit.info("Spring bean editor: {} persisted {}.{} = '{}' in {}", actor, beanName, name, newValue, store.getFile());
                } catch (RuntimeException e) {
                    result.errors.add(e.getMessage());
                }
            }
        }
        return result;
    }
}
