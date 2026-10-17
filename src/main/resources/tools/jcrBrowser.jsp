<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="st" uri="http://www.jahia.org/tags/supertools" %>
<st:requireToolsAccess/>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<c:set var="title">JCR browser</c:set>
<c:set var="description">
    <p>JCR repository browser on the javax.jcr-like GraphQL API of this module (<code>admin.superTools.jcr</code>).
        The <em>Pure JCR</em> session shows the default provider as the repository holds it (translation nodes,
        protected properties, system nodes); the <em>Jahia JCR</em> session uses a <code>JCRSessionWrapper</code>
        with a language, visibility and validity checks, permissions, and can impersonate a user. The current node,
        workspace and session live in the URL fragment so a view can be bookmarked or shared.</p>
</c:set>
<head>
    <%@ include file="../commons/html_header.jspf" %>
</head>
<body>
<c:set var="headerActions">
    <li><a href="<c:url value='/modules/tools/jcrBrowser.jsp'/>"><span class="material-symbols-outlined">account_tree</span>Classic JCR browser</a></li>
    <li><a href="<c:url value='/modules/tools/jcrQuery.jsp'/>"><span class="material-symbols-outlined">search</span>JCR query tool</a></li>
</c:set>
<%@ include file="../commons/header.jspf" %>

<div id="jcr-browser-root" class="st-app"
     data-context-path="${pageContext.request.contextPath}"
     data-graphql-endpoint="<c:url value='/modules/graphql'/>">
    <div class="st-loading">Loading JCR browser...</div>
</div>

<%@ include file="../commons/footer.jspf" %>
<script src="<c:url value='/modules/jahia-super-tools/javascript/apps/jcrBrowser.bundle.js'/>"></script>
</body>
</html>
