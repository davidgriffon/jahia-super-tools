<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="st" uri="http://www.jahia.org/tags/supertools" %>
<st:requireToolsAccess/>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<c:set var="title">Jahia Super Tools</c:set>
<c:set var="description">
    <p>Additional support tools packaged as a standalone module. Every tool is also listed in the <em>Modules</em>
        section of the <a href="<c:url value='/modules/tools/index.jsp'/>">Support Tools</a> home page.</p>
</c:set>
<head>
    <%@ include file="commons/html_header.jspf" %>
</head>
<body>
<%@ include file="commons/header.jspf" %>

<div class="st-tool-list">
    <div class="st-tool-card">
        <h2><a href="tools/jcrBrowser.jsp">JCR Explorer</a></h2>
        <p>Raw <code>javax.jcr</code> view of the default and live workspaces through a dedicated GraphQL API: tree,
            properties with their definitions (protected ones included), references, versions, locks, add node,
            mixins, set or remove properties, rename, move, checkin and checkout, export and remove.</p>
        <code>tools/jcrBrowser.jsp</code>
    </div>
    <div class="st-tool-card">
        <h2><a href="tools/cacheBrowser.jsp">Output cache browser</a></h2>
        <p>Statistics of the HTML output cache, paginated entries grouped by any cache key part (site, language,
            template, ACL...), parsed keys, cached content preview and per-entry or global flush.</p>
        <code>tools/cacheBrowser.jsp</code>
    </div>
    <div class="st-tool-card">
        <h2><a href="tools/permissionTester.jsp">User permissions inspector</a></h2>
        <p>Explains why a user or group has (or has not) a permission on a node: effective roles, where each role is
            granted, node and site level permissions, with a direct check through <code>hasPermission()</code>.</p>
        <code>tools/permissionTester.jsp</code>
    </div>
    <div class="st-tool-card">
        <h2><a href="tools/springBeanEditor.jsp">Spring bean editor</a></h2>
        <p>Pick a Spring context (Jahia core or a module), then one of its beans, to view and change its String,
            number and boolean values at runtime. Each value tells where it comes from; core changes can be persisted
            as a Spring override file applied at every startup.</p>
        <code>tools/springBeanEditor.jsp</code>
    </div>
    <div class="st-tool-card">
        <h2><a href="tools/assetsUsage.jsp">Assets usage checker</a></h2>
        <p>Scans every active module for references to the static resources of another bundle (by default the
            <code>assets</code> module) and reports which files are still used, how often and from where.</p>
        <code>tools/assetsUsage.jsp</code>
    </div>
</div>

<%@ include file="commons/footer.jspf" %>
</body>
</html>
