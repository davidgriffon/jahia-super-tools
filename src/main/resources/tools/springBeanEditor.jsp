<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="st" uri="http://www.jahia.org/tags/supertools" %>
<st:requireToolsAccess/>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ page import="org.jahia.community.supertools.security.SuperToolsCsrf" %>
<!DOCTYPE html>
<html>
<c:set var="title">Spring bean editor</c:set>
<c:set var="description">
    <p>Select a Spring context, then one of its beans, to view and change its String and primitive values at runtime.
        A change is applied in memory; for the Jahia core context it can also be persisted as a Spring override
        file, so that it is applied again at every startup. Platform settings, data sources and security beans are
        not editable, values that look like secrets are masked, and every change is written to the server log.</p>
</c:set>
<head>
    <%@ include file="../commons/html_header.jspf" %>
</head>
<body>
<%@ include file="../commons/header.jspf" %>

<%-- The editor is a React application (src/javascript/bean-editor) talking to tools/api/springBeanEditor.jsp. --%>
<div id="spring-bean-editor-root" class="st-app"
     data-api-url="<c:url value='/modules/jahia-super-tools/tools/api/springBeanEditor.jsp'/>"
     data-token-url="<c:url value='/modules/tools/token'/>"
     data-token="${fn:escapeXml(toolAccessToken)}"
     data-csrf="<%= SuperToolsCsrf.token(request) %>">
    <div class="st-loading">Loading Spring bean editor...</div>
</div>

<%@ include file="../commons/footer.jspf" %>
<script src="<c:url value='/modules/jahia-super-tools/javascript/apps/beanEditor.bundle.js'/>"></script>
</body>
</html>
