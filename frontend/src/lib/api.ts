export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // If accessed on LAN (e.g., http://192.168.1.50:3000), use the same host for backend on port 4000
    const hostname = window.location.hostname;
    return `http://${hostname}:4000`;
  }
  return 'http://localhost:4000';
};

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  // Handle file downloads
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/octet-stream') || response.headers.get('content-disposition'))) {
    return response.blob();
  }

  return response.json();
}
