<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="st" uri="http://www.jahia.org/tags/supertools" %>
<st:requireToolsAccess/>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<c:set var="title">Output cache browser</c:set>
<c:set var="description">
    <p>Browse the entries of the HTML output cache (module cache), grouped by any part of the cache key. Entries can be
        flushed one by one or all at once. Data is read through the GraphQL API of this module.</p>
</c:set>
<head>
    <%@ include file="../commons/html_header.jspf" %>
</head>
<body>
<c:set var="headerActions">
    <li><a href="<c:url value='/modules/tools/cache.jsp'/>"><span class="material-symbols-outlined">arrow_back</span>Cache management</a></li>
    <li><a href="<c:url value='/modules/tools/ehcache/ehcache_stats.jsp'/>"><span class="material-symbols-outlined">monitoring</span>Legacy cache statistics</a></li>
</c:set>
<%@ include file="../commons/header.jspf" %>

<div id="cache-browser-root" class="st-app"
     data-context-path="${pageContext.request.contextPath}"
     data-graphql-endpoint="<c:url value='/modules/graphql'/>">
    <div class="st-loading">Loading cache browser...</div>
</div>

<%@ include file="../commons/footer.jspf" %>
<script src="<c:url value='/modules/jahia-super-tools/javascript/apps/cacheBrowser.bundle.js'/>"></script>
</body>
</html>
