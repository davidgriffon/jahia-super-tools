export function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes <= 0) {
        return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatNumber(num) {
    if (num === null || num === undefined) {
        return '0';
    }
    return Number(num).toLocaleString();
}

export function formatDate(dateValue) {
    if (!dateValue) {
        return 'N/A';
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return String(dateValue);
    }
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDuration(ms) {
    if (ms === null || ms === undefined || ms <= 0) {
        return 'expired';
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

export function formatRelativeTime(dateValue) {
    if (!dateValue) {
        return 'N/A';
    }
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return String(dateValue);
    }
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) {
        return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
        return `${diffHours}h ago`;
    }
    if (diffMinutes > 0) {
        return `${diffMinutes}m ago`;
    }
    if (diffSeconds > 0) {
        return `${diffSeconds}s ago`;
    }
    return 'just now';
}

export function copyToClipboard(text) {
    if (navigator.clipboard && text) {
        return navigator.clipboard.writeText(text);
    }
    return Promise.resolve();
}
