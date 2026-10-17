export interface TokenResponse {
    access: string;
    refresh: string;
}

export class ResponseWithError extends Error {
    public data: any;

    constructor(message: string, data: any) {
        super(message);
        this.data = data;
        Object.setPrototypeOf(this, ResponseWithError.prototype);
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}

export function GetImageSrc(url: string): string {
    const useLocalImagebed = localStorage.getItem('useLocalImagebed') === 'true';
    if (useLocalImagebed && url.indexOf('thumbnails') === -1) {
        const localImagebedPath = localStorage.getItem('localImagebedPath') || '';
        return `${localImagebedPath}${url}`;
    }
    return url;
}

export async function fetchJsonWithToken(url: string, token: string, para: object, method: string, json: boolean): Promise<object> {
    const headers: Record<string, string> = {
        'Authorization': 'Bearer ' + token,
    };
    const init: RequestInit = { method };
    if (method !== 'GET' && method !== 'HEAD') {
        if (json) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(para);
        } else {
            init.body = para as BodyInit;
        }
    }
    init.headers = headers;

    const response = await fetch(url, init);

    if (response.status === 204) {
        return {};
    }

    let data: any = {};
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { message: text };
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            return { message: 'not authorized' };
        }
        throw new ResponseWithError('Network response was not ok', data);
    }

    return data;
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(refreshToken: string): Promise<boolean> {
    if (!refreshPromise) {
        refreshPromise = performTokenRefresh(refreshToken).finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

async function performTokenRefresh(refreshToken: string): Promise<boolean> {
    const response = await fetch('/api/refresh/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh: refreshToken })
    });

    if (!response.ok) {
        return false;
    }

    const data = await response.json() as TokenResponse;
    localStorage.setItem('wardrobe-access-token', data.access);
    if (data.refresh) {
        localStorage.setItem('wardrobe-refresh-token', data.refresh);
    }
    return true;
}

const TOKEN_REFRESH_INTERVAL_MS = 60 * 1000;
const TOKEN_REFRESH_MARGIN_MS = 2 * 60 * 1000;

function getTokenExpiry(token: string): number | null {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

export async function refreshAccessTokenIfNeeded(): Promise<boolean> {
    const refreshToken = localStorage.getItem('wardrobe-refresh-token');
    if (!refreshToken) {
        return false;
    }

    const accessToken = localStorage.getItem('wardrobe-access-token');
    const expiresAt = accessToken ? getTokenExpiry(accessToken) : null;
    if (expiresAt && expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
        return true;
    }

    return refreshAccessToken(refreshToken);
}

export function startTokenRefreshScheduler(): void {
    const tick = () => {
        void refreshAccessTokenIfNeeded().catch(() => { });
    };
    window.setInterval(tick, TOKEN_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            tick();
        }
    });
    tick();
}

export async function fetchDataAutoRetry(url: string, para: object, method = 'POST', json = true): Promise<object> {
    let data;
    try {
        let accessToken = localStorage.getItem('wardrobe-access-token');
        if (!accessToken) {
            console.log('No access token found. Please log in again.');
            throw new AuthenticationError('No access token found. Please log in again.');
        }
        data = await fetchJsonWithToken(url, accessToken, para, method, json) as any;
        if (data.message === 'not authorized') {
            const refreshToken = localStorage.getItem('wardrobe-refresh-token');
            if (!refreshToken) {
                console.log('No refresh token found. Please log in again.');
                throw new AuthenticationError('No refresh token found. Please log in again.');
            }
            try {
                if (await refreshAccessToken(refreshToken)) {
                    accessToken = localStorage.getItem('wardrobe-access-token');
                    if (!accessToken) {
                        console.log('No access token found. Please log in again.');
                        throw new AuthenticationError('No access token found. Please log in again.');
                    }
                    data = await fetchJsonWithToken(url, accessToken, para, method, json);
                    if ((data as any).message === 'not authorized') {
                        throw new AuthenticationError('The refreshed access token was rejected.');
                    }
                }
                else {
                    console.log('Refresh token failed. Please log in again.');
                    throw new AuthenticationError('Refresh token failed. Please log in again.');
                }
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                if (refreshError instanceof AuthenticationError) {
                    throw refreshError;
                }
                throw new Error('Error refreshing token');
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (error instanceof ResponseWithError || error instanceof AuthenticationError) {
            throw error;
        }
        throw new Error('Error fetching data');
    }
    return data;
}

export async function checkToken(token: string): Promise<boolean> {
    const response = await fetch('/auth/', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    });
    return response.ok;
}
