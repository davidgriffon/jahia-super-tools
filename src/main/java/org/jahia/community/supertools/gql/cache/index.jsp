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
        <h2><a href="tools/jcrBrowser.jsp">JCR browser (React)</a></h2>
        <p>Browse the repository with a lazy-loading tree, inspect properties with their definitions, edit or remove
            properties, add or remove mixins, lock, rename, delete and export nodes. Works in both workspaces and all
            languages through the standard GraphQL API.</p>
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
        <h2><a href="tools/assetsUsage.jsp">Assets usage checker</a></h2>
        <p>Scans every active module for references to the static resources of another bundle (by default the
            <code>assets</code> module) and reports which files are still used, how often and from where.</p>
        <code>tools/assetsUsage.jsp</code>
    </div>
</div>

<%@ include file="commons/footer.jspf" %>
</body>
</html>
