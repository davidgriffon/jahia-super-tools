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
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.decorator.JCRUserNode;
import org.jahia.services.usermanager.JahiaUser;
import org.jahia.services.usermanager.JahiaUserManagerService;
import org.jahia.utils.LanguageCodeConverters;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.Node;
import javax.jcr.RepositoryException;
import javax.jcr.Session;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.Locale;

/**
 * Opens the session a browser request works on. Two kinds exist:
 * <ul>
 *     <li>{@link #MODE_RAW}: the raw {@link javax.jcr.Session} of the default (Jackrabbit) provider, the way the
 *     classic JCR browser of the Support Tools does: translation nodes, protected properties and system nodes are
 *     visible, nothing is decorated. It is the per-request system session of Jahia.</li>
 *     <li>{@link #MODE_JAHIA}: a Jahia {@link JCRSessionWrapper} (nodes are {@code JCRNodeWrapperImpl}), opened for
 *     the connected user or for an impersonated user, with an optional locale: internationalized properties are
 *     resolved, translation nodes are hidden, visibility and validity checks are available.</li>
 * </ul>
 * Both are cached by Jahia for the request thread and closed by the platform at the end of the request; the tools
 * access permission checked upstream is what protects them.
 */
public final class JcrSessions {

    public static final String DEFAULT_WORKSPACE = "default";
    public static final List<String> WORKSPACES = Arrays.asList(DEFAULT_WORKSPACE, "live");
    public static final String MODE_RAW = "RAW";
    public static final String MODE_JAHIA = "JAHIA";

    /** What a request asked for; the same values are echoed back by the session field. */
    public static final class Context {
        private final String workspace;
        private final String mode;
        private final String language;
        private final String user;
        private final String actor;

        public Context(String workspace, String mode, String language, String user) {
            JahiaUser current = JCRSessionFactory.getInstance().getCurrentUser();
            this.actor = current == null ? "unknown user" : current.getUsername();
            this.workspace = workspace(workspace);
            this.mode = mode == null || mode.trim().isEmpty() ? MODE_RAW : mode.trim().toUpperCase(Locale.ROOT);
            if (!MODE_RAW.equals(this.mode) && !MODE_JAHIA.equals(this.mode)) {
                throw new DataFetchingException("Unknown session mode '" + mode + "', expected RAW or JAHIA");
            }
            this.language = language == null || language.trim().isEmpty() ? null : language.trim();
            this.user = user == null || user.trim().isEmpty() ? null : user.trim();
        }

        public String getWorkspace() {
            return workspace;
        }

        public String getMode() {
            return mode;
        }

        public boolean isJahia() {
            return MODE_JAHIA.equals(mode);
        }

        public String getLanguage() {
            return language;
        }

        public Locale getLocale() {
            return language == null ? null : LanguageCodeConverters.languageCodeToLocale(language);
        }

        public String getUser() {
            return user;
        }

        /** The connected user, for the audit log (not the impersonated one). */
        public String getActor() {
            return actor;
        }

        public String describe() {
            return workspace + " workspace, " + (isJahia() ? "Jahia session" + (user != null ? " as " + user : "") + (language != null ? ", " + language : "") : "raw session");
        }
    }

    private JcrSessions() {
        // utility class
    }

    public static String workspace(String workspace) {
        String name = workspace == null || workspace.trim().isEmpty() ? DEFAULT_WORKSPACE : workspace.trim();
        if (!WORKSPACES.contains(name)) {
            throw new DataFetchingException("Unknown workspace '" + name + "', expected one of " + WORKSPACES);
        }
        return name;
    }

    /** The session matching the context: raw provider session, or Jahia session (impersonated when a user is given). */
    public static Session open(Context context) {
        return context.isJahia() ? jahia(context) : raw(context.getWorkspace());
    }

    public static Session raw(String workspace) {
        try {
            JCRSessionWrapper wrapper = JCRSessionFactory.getInstance().getCurrentSystemSession(workspace(workspace), null, null);
            return wrapper.getProviderSession(JCRSessionFactory.getInstance().getDefaultProvider());
        } catch (RepositoryException e) {
            throw fail("Cannot open the " + workspace + " workspace", e);
        }
    }

    /**
     * A Jahia session for the connected user, or for the impersonated one. Jahia caches the current-user sessions of
     * a thread per user name, so the current user is switched only for the time of the lookup and restored right
     * after: the rest of the request still runs as the connected user, while the returned session belongs to the
     * impersonated one until the platform closes it with the request.
     */
    public static JCRSessionWrapper jahia(Context context) {
        JCRSessionFactory factory = JCRSessionFactory.getInstance();
        JahiaUser previous = factory.getCurrentUser();
        try {
            if (context.getUser() != null) {
                JCRUserNode userNode = JahiaUserManagerService.getInstance().lookupUser(context.getUser());
                if (userNode == null) {
                    throw new DataFetchingException("Unknown user '" + context.getUser() + "'");
                }
                factory.setCurrentUser(userNode.getJahiaUser());
            } else if (previous == null) {
                throw new DataFetchingException("No connected user: a Jahia session needs a user");
            }
            return factory.getCurrentUserSession(context.getWorkspace(), context.getLocale(), null);
        } catch (RepositoryException e) {
            throw fail("Cannot open a Jahia session on " + context.getWorkspace(), e);
        } finally {
            factory.setCurrentUser(previous);
        }
    }

    /** Resolves a node by uuid when given, by path otherwise (the root node when both are missing). */
    public static Node node(Session session, String path, String uuid) {
        try {
            if (uuid != null && !uuid.trim().isEmpty()) {
                return session.getNodeByIdentifier(uuid.trim());
            }
            return session.getNode(path == null || path.trim().isEmpty() ? "/" : path.trim());
        } catch (RepositoryException e) {
            throw fail(e);
        }
    }

    private static final Logger logger = LoggerFactory.getLogger(JcrSessions.class);

    /**
     * Turns a repository failure into a client error that names the JCR exception type (the information an
     * administrator acts on: {@code PathNotFoundException}, {@code LockException}, {@code AccessDeniedException}...)
     * but not its message, which can carry internal paths or configuration. The full exception goes to the server
     * log under a reference quoted in the client message.
     */
    public static DataFetchingException fail(Exception e) {
        return fail(null, e);
    }

    public static DataFetchingException fail(String context, Exception e) {
        String reference = UUID.randomUUID().toString();
        logger.warn("JCR Explorer failure (reference {}){}", reference, context == null ? "" : ": " + context, e);
        String message = e.getClass().getSimpleName() + " (see the server log, reference " + reference + ")";
        return new DataFetchingException(context == null ? message : context + ": " + message);
    }
}
