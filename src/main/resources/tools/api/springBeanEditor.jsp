<%@ page contentType="application/json; charset=UTF-8" language="java" trimDirectiveWhitespaces="true" %>
<%@ taglib prefix="st" uri="http://www.jahia.org/tags/supertools" %>
<st:requireToolsAccess/>
<%@ page import="org.jahia.community.supertools.spring.SpringBeanEditorApi" %>
<%--
  JSON API behind the Spring bean editor page (../springBeanEditor.jsp). It lives under tools/api so that it is not
  listed as a tool by ModuleToolsHelper, while still matching the Support Tools CSRF filter. The actions are
  documented in SpringBeanEditorApi.
--%>
<% SpringBeanEditorApi.handle(request, response); %>
