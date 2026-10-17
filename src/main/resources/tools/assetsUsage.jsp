<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="st" uri="http://www.jahia.org/tags/supertools" %>
<st:requireToolsAccess/>
<%@ page import="org.jahia.community.supertools.assets.AssetsUsageScanner" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<!DOCTYPE html>
<html>
<c:set var="title">Assets usage checker</c:set>
<c:set var="description">
    <p>Finds, in every active module, the references to the static resources of a target bundle. Quoted strings
        containing the search pattern and <code>&lt;template:addResources&gt;</code> tags are both collected; when the
        target bundle is deployed, only the resources it really contains are listed.</p>
</c:set>
<%
    String searchPattern = request.getParameter("searchPattern");
    String targetBundle = request.getParameter("targetBundle");
    pageContext.setAttribute("searchPattern", searchPattern == null || searchPattern.trim().isEmpty() ? AssetsUsageScanner.DEFAULT_SEARCH_PATTERN : searchPattern.trim());
    pageContext.setAttribute("targetBundle", targetBundle == null || targetBundle.trim().isEmpty() ? AssetsUsageScanner.DEFAULT_TARGET_BUNDLE : targetBundle.trim());
    // The scan reads every module bundle: it only runs on an explicit POST, one at a time, within a read budget.
    if ("POST".equals(request.getMethod()) && "true".equals(request.getParameter("scan"))) {
        long start = System.currentTimeMillis();
        try {
            pageContext.setAttribute("report", AssetsUsageScanner.scan(searchPattern, targetBundle));
        } catch (IllegalStateException busy) {
            pageContext.setAttribute("busyMsg", busy.getMessage());
        }
        pageContext.setAttribute("duration", System.currentTimeMillis() - start);
    }
%>
<head>
    <%@ include file="../commons/html_header.jspf" %>
</head>
<body>
<%@ include file="../commons/header.jspf" %>

<div class="st-form">
    <form method="post" action="?">
        <input type="hidden" name="toolAccessToken" value="${fn:escapeXml(toolAccessToken)}"/>
        <input type="hidden" name="scan" value="true"/>
        <div class="form-grid">
            <div class="form-field">
                <label for="searchPattern">Search pattern</label>
                <input type="text" id="searchPattern" name="searchPattern" value="${fn:escapeXml(searchPattern)}" placeholder="/assets/"/>
            </div>
            <div class="form-field">
                <label for="targetBundle">Target bundle (symbolic name)</label>
                <input type="text" id="targetBundle" name="targetBundle" value="${fn:escapeXml(targetBundle)}" placeholder="assets"/>
            </div>
            <div class="form-field">
                <label>&nbsp;</label>
                <input type="submit" value="Scan modules"/>
            </div>
        </div>
        <p class="st-muted">The scan reads every active module bundle (up to 2 MB per file and 256 MB in total) on this request; only one scan runs at a time.</p>
    </form>
</div>

<c:if test="${not empty busyMsg}">
    <div class="st-warning">${fn:escapeXml(busyMsg)}</div>
</c:if>

<c:if test="${not empty report}">
    <p>Scanned <strong>${report.scannedModules}</strong> active modules (${report.scannedBytes} bytes) in ${duration} ms for
        <code>${fn:escapeXml(report.searchPattern)}</code>, target bundle <code>${fn:escapeXml(report.targetBundle)}</code>.</p>
    <c:if test="${report.truncated}">
        <div class="st-warning">The read budget was spent before the last module: this report is partial.</div>
    </c:if>
    <c:if test="${report.skippedEntries > 0}">
        <p class="st-muted">${report.skippedEntries} entries larger than the per-file limit were skipped.</p>
    </c:if>
    <c:if test="${not report.targetBundleFound}">
        <div class="st-warning">Bundle <code>${fn:escapeXml(report.targetBundle)}</code> is not active: results are not
            filtered by the resources it contains.</div>
    </c:if>
    <c:choose>
        <c:when test="${report.totalResources == 0}">
            <p>No resources found.</p>
        </c:when>
        <c:otherwise>
            <p>Found <span class="st-count">${report.totalResources}</span> unique resources with
                <span class="st-count">${report.totalUsages}</span> usages across
                <span class="st-count">${report.moduleCount}</span> modules.</p>

            <h2>Global summary</h2>
            <div class="st-section">
                <table class="st-table">
                    <thead>
                    <tr><th>Type</th><th>Resource path</th><th>Usages</th><th>Modules using it</th></tr>
                    </thead>
                    <tbody>
                    <c:forEach var="resource" items="${report.globalResources}">
                        <tr>
                            <td>${fn:escapeXml(resource.type)}</td>
                            <td class="st-mono">${fn:escapeXml(resource.resourcePath)}
                                <c:if test="${resource.existsInTarget}"><span class="st-badge">&#10003; in ${fn:escapeXml(report.targetBundle)}</span></c:if>
                            </td>
                            <td class="st-count">${resource.usageCount}</td>
                            <td class="st-muted">${resource.moduleCount} modules: ${fn:escapeXml(resource.moduleNames)}</td>
                        </tr>
                    </c:forEach>
                    </tbody>
                </table>
            </div>

            <h2>Per-module breakdown</h2>
            <c:forEach var="moduleEntry" items="${report.moduleResources}">
                <div class="st-section">
                    <div class="st-section-title">${fn:escapeXml(moduleEntry.key)}</div>
                    <table class="st-table">
                        <thead>
                        <tr><th>Type</th><th>Resource path</th><th>Usages</th><th>Used in files</th></tr>
                        </thead>
                        <tbody>
                        <c:forEach var="resource" items="${moduleEntry.value}">
                            <tr>
                                <td>${fn:escapeXml(resource.type)}</td>
                                <td class="st-mono">${fn:escapeXml(resource.resourcePath)}</td>
                                <td class="st-count">${resource.usageCount}</td>
                                <td>
                                    <c:forEach var="file" items="${resource.usedInFiles}" varStatus="status">
                                        <c:if test="${not status.first}">, </c:if><span class="st-muted">${fn:escapeXml(file)}</span>
                                    </c:forEach>
                                </td>
                            </tr>
                        </c:forEach>
                        </tbody>
                    </table>
                </div>
            </c:forEach>
        </c:otherwise>
    </c:choose>
</c:if>

<%@ include file="../commons/footer.jspf" %>
</body>
</html>
