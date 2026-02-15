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

export async function GetBlobImgSrc(url: string): Promise<string> {
    const token = localStorage.getItem('wardrobe-access-token') || 'default-token';
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
                // 或者使用其他 token 格式
                // 'X-Token': token
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token 过期，刷新 Token
                const refreshToken = localStorage.getItem('wardrobe-refresh-token');
                if (!refreshToken) {
                    console.error('Refresh token not found!');
                    throw new ResponseWithError('Refresh token failed', null);
                }
                try {
                    const res = await refreshAccessToken(refreshToken);
                    if (!res) {
                        console.error('Refresh token failed');
                        throw new ResponseWithError('Refresh token failed', null);
                    }
                } catch (error) {
                    console.error('Refresh token failed:', error);
                    throw new ResponseWithError('Refresh token failed', null);
                }
                // 重新加载图片
                return GetBlobImgSrc(url);
            }
            throw new Error(`Image load failed! status: ${response.status}`);
        } else {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            return objectUrl;
        }
    } catch (error) {
        console.error('图片加载失败:', error);
        // 可以设置一个默认图片
        return '/default-image.jpg';
    }
}

export async function fetchJsonWithToken(url: string, token: string, para: object, method: string, json: boolean): Promise<object> {
    let response;
    if (method == 'POST') {
        response = await fetch(url, {
            method: "POST",
            body: json ? JSON.stringify(para) : para as any,
            headers: json ? {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            } : {
                'Authorization': 'Bearer ' + token
            }
        });
    } else {
        response = await fetch(url, {
            method: "GET",
            headers: {
                'Content-Type': 'form-data',
                'Authorization': 'Bearer ' + token
            }
        });
    }

    if (!response.ok) {
        if (response.status === 401) {
            return { message: 'not authorized' };
        }
        throw new ResponseWithError('Network response was not ok', await response.json());
    }

    return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<boolean> {
    const response = await fetch('/api/refresh/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh: refreshToken })
    });

    if (!response.ok) {
        return false;
    } else {
        const data = await response.json() as TokenResponse;
        localStorage.setItem('wardrobe-access-token', data.access);
    }
    return true;
}

export async function fetchDataAutoRetry(url: string, para: object, method = 'POST', json = true): Promise<object> {
    let data;
    try {
        let accessToken = localStorage.getItem('wardrobe-access-token');
        if (!accessToken) {
            console.log('No access token found. Please log in again.');
            throw new Error('No access token found. Please log in again.');
        }
        data = await fetchJsonWithToken(url, accessToken, para, method, json) as any;
        if (data.message === 'not authorized') {
            const refreshToken = localStorage.getItem('wardrobe-refresh-token');
            if (!refreshToken) {
                console.log('No refresh token found. Please log in again.');
                throw new Error('No refresh token found. Please log in again.');
            }
            try {
                if (await refreshAccessToken(refreshToken)) {
                    accessToken = localStorage.getItem('wardrobe-access-token');
                    if (!accessToken) {
                        console.log('No access token found. Please log in again.');
                        throw new Error('No access token found. Please log in again.');
                    }
                    data = await fetchJsonWithToken(url, accessToken, para, method, json);
                }
                else {
                    console.log('Refresh token failed. Please log in again.');
                    throw new Error('Refresh token failed. Please log in again.');
                }
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                throw new Error('Error refreshing token');
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (error instanceof ResponseWithError) {
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
