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
package org.jahia.community.supertools.security;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/**
 * CSRF protection owned by this module for its state-changing JSON endpoints, independent from the token filter of
 * the Support Tools module (which may be absent, and which stops validating in development mode).
 *
 * <p>A POST must carry a same-origin {@code Origin} (or {@code Referer}) header and the per-session token, sent in
 * the {@value #HEADER} header or the {@value #PARAMETER} parameter. The token is handed to the page by the JSP shell.
 */
public final class SuperToolsCsrf {

    public static final String SESSION_ATTRIBUTE = "superToolsCsrfToken";
    public static final String HEADER = "X-SuperTools-Csrf";
    public static final String PARAMETER = "superToolsCsrf";

    private SuperToolsCsrf() {
        // utility class
    }

    /** The token of the current session, created on first use. */
    public static String token(HttpServletRequest request) {
        HttpSession session = request.getSession(true);
        synchronized (session) {
            String token = (String) session.getAttribute(SESSION_ATTRIBUTE);
            if (token == null) {
                token = UUID.randomUUID().toString();
                session.setAttribute(SESSION_ATTRIBUTE, token);
            }
            return token;
        }
    }

    /**
     * @return {@code null} when the request may proceed, otherwise the reason it must be refused
     */
    public static String rejectReason(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        String source = request.getHeader("Origin") != null ? request.getHeader("Origin") : request.getHeader("Referer");
        if (source == null || source.trim().isEmpty() || "null".equals(source)) {
            return "Missing Origin and Referer headers";
        }
        String host;
        try {
            host = URI.create(source.trim()).getHost();
        } catch (IllegalArgumentException e) {
            host = null;
        }
        if (host == null || !host.equalsIgnoreCase(request.getServerName())) {
            return "Cross-origin request refused (origin " + source + ")";
        }
        HttpSession session = request.getSession(false);
        String expected = session == null ? null : (String) session.getAttribute(SESSION_ATTRIBUTE);
        String provided = request.getHeader(HEADER) != null ? request.getHeader(HEADER) : request.getParameter(PARAMETER);
        if (expected == null || provided == null
                || !MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), provided.getBytes(StandardCharsets.UTF_8))) {
            return "Missing or invalid CSRF token";
        }
        return null;
    }
}
