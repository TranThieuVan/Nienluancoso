const API_URL = import.meta.env.VITE_API_URL || '';

export const apiUrl = (path = '') => {
    return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const imageUrl = (path) => {
    if (!path) return '';

    if (path.startsWith('http') || path.startsWith('data:')) {
        return path;
    }

    return apiUrl(path);
};
console.log('API BASE URL:', API_URL);

export const SOCKET_URL = API_URL || 'http://localhost:5000';