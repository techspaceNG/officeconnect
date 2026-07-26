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

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const contentDisposition = response.headers.get('content-disposition');

  // If response has content-disposition header or is not JSON, return binary Blob
  if (contentDisposition || (contentType && !contentType.includes('application/json'))) {
    return response.blob();
  }

  return response.json();
}

export async function apiDownloadBlob(endpoint: string, options: RequestInit = {}) {
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
    let errorMsg = 'Download failed';
    try {
      const data = await response.json();
      errorMsg = data.message || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.blob();
}

export function apiUploadWithProgress(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    xhr.open('POST', `${getApiUrl()}${endpoint}`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        let errorMsg = 'Upload failed';
        try {
          const data = JSON.parse(xhr.responseText);
          errorMsg = data.message || errorMsg;
        } catch (e) {}
        reject(new Error(errorMsg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
