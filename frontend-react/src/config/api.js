const raw = import.meta.env.VITE_API_URL || '';
export const API_URL = raw.replace(/\/+$/, '');

export const apiUrl = (path = '') =>
    `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const imageUrl = (path) => {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return apiUrl(path);
};

export const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

if (import.meta.env.DEV) console.log('API BASE URL:', API_URL);