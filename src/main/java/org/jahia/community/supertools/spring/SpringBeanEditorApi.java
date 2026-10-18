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

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jahia.community.supertools.security.SuperToolsCsrf;
import org.jahia.community.supertools.spring.SpringBeanEditorHelper.ContextInfo;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.usermanager.JahiaUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanDefinition;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * JSON API behind the Spring bean editor page, called by {@code tools/api/springBeanEditor.jsp}. Kept in Java rather
 * than in the JSP so that the JSON serialization (Jackson) is resolved by the bundle class loader, not by the JSP
 * compiler. Every call carries the Support Tools access token as a request parameter, validated by the tools CSRF
 * filter when the tools module is installed.
 *
 * <pre>
 * GET  ?action=contexts                          the Spring contexts
 * GET  ?action=overrides                         what the override file of the core context pins
 * GET  ?action=beans&amp;context=&lt;id&gt;                the instantiated singleton beans of a context
 * GET  ?action=bean&amp;context=&lt;id&gt;&amp;bean=&lt;name&gt;     one bean with its properties and their status
 * POST action=save&amp;context=&lt;id&gt;&amp;bean=&lt;name&gt;&amp;mode=memory|persist + prop_/null_/restore_/persist_/unpersist_&lt;property&gt;
 *                                                 what the save did, plus the refreshed bean view
 * </pre>
 * A POST must pass {@link SuperToolsCsrf}: same-origin header plus the session token the page received. Unexpected
 * failures are logged with a reference and answered with a generic message.
 */
public final class SpringBeanEditorApi {

    private static final Logger logger = LoggerFactory.getLogger(SpringBeanEditorApi.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private SpringBeanEditorApi() {
        // utility class
    }

    public static void handle(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String action = request.getParameter("action");
        Map<String, Object> body = new LinkedHashMap<>();
        int status = HttpServletResponse.SC_OK;
        String csrfRejection = SuperToolsCsrf.rejectReason(request);
        try {
            if (csrfRejection != null) {
                status = HttpServletResponse.SC_FORBIDDEN;
                body.put("error", csrfRejection);
            } else if ("contexts".equals(action)) {
                body = SpringBeanEditorViews.contexts();
            } else if ("overrides".equals(action)) {
                body = SpringBeanEditorViews.overrides(SpringBeanOverrideStore.forCoreContext());
            } else {
                ContextInfo context = SpringBeanEditorHelper.getContext(request.getParameter("context"));
                if (context == null) {
                    status = HttpServletResponse.SC_BAD_REQUEST;
                    body.put("error", "Unknown context");
                } else {
                    status = handleContext(request, action, context, body);
                }
            }
        } catch (RuntimeException e) {
            String reference = UUID.randomUUID().toString();
            logger.error("Spring bean editor request failed (reference {})", reference, e);
            status = HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
            body = new LinkedHashMap<>();
            body.put("error", "Unexpected error, see the server log (reference " + reference + ")");
        }
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().print(MAPPER.writeValueAsString(body));
    }

    private static String actor() {
        JahiaUser user = JCRSessionFactory.getInstance().getCurrentUser();
        return user == null ? "unknown user" : user.getUsername();
    }

    private static int handleContext(HttpServletRequest request, String action, ContextInfo context, Map<String, Object> body) {
        SpringBeanOverrideStore store = SpringBeanEditorViews.storeFor(context);
        String beanName = request.getParameter("bean");
        if ("beans".equals(action)) {
            body.putAll(SpringBeanEditorViews.beans(context, store));
            return HttpServletResponse.SC_OK;
        }
        if (!"bean".equals(action) && !"save".equals(action)) {
            body.put("error", "Unknown action '" + action + "'");
            return HttpServletResponse.SC_BAD_REQUEST;
        }
        Object bean = SpringBeanEditorHelper.getBean(context.getContext(), beanName);
        if (bean == null) {
            body.put("error", "Bean '" + beanName + "' is not an instantiated singleton of this context");
            return HttpServletResponse.SC_BAD_REQUEST;
        }
        if ("save".equals(action)) {
            if (!"POST".equals(request.getMethod())) {
                body.put("error", "A save must be a POST");
                return HttpServletResponse.SC_METHOD_NOT_ALLOWED;
            }
            if (!SpringBeanEditorHelper.CORE_CONTEXT_ID.equals(context.getId())) {
                body.put("error", "Beans of a module context are read only: only the beans of the Jahia core context can be edited");
                return HttpServletResponse.SC_FORBIDDEN;
            }
            BeanDefinition definition = SpringBeanEditorHelper.getBeanDefinition(context.getContext(), beanName);
            boolean persist = store != null && "persist".equals(request.getParameter("mode"));
            body.put("result", SpringBeanEditorSave.apply(bean, beanName, definition, store, persist, request::getParameter, actor(), context.getId()));
        }
        body.put("bean", SpringBeanEditorViews.bean(context, beanName, store));
        return HttpServletResponse.SC_OK;
    }
}
