export interface TokenResponse {
    access: string;
    refresh: string;
}

export async function loadImageWithToken(url: string, img: HTMLImageElement): Promise<void> {
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
                    
                    return;
                }

                try {
                    await refreshAccessToken(refreshToken);
                } catch (error) {
                    console.error('Refresh token failed:', error);
                    
                    return;
                }
                // 重新加载图片
                loadImageWithToken(url, img);
                return;
            }
            throw new Error(`Image load failed! status: ${response.status}`);
        } else {
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            img.src = objectUrl;
        }
    } catch (error) {
        console.error('图片加载失败:', error);
        // 可以设置一个默认图片
        // img.src = '/default-image.jpg';
    }
}

export async function fetchJsonWithToken(url: string, token: string, para: object, method: string): Promise<object> {
    let response;
    if (method == 'POST') {
        response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(para),
            headers: {
                'Content-Type': 'application/json',
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
        localStorage.setItem('wardrobe-refresh-token', data.refresh);
        localStorage.setItem('wardrobe-access-token', data.access);
    }
    return true;
}

export async function fetchDataAutoRetry(url: string, para: object, method = 'POST'): Promise<object | null> {
    let data;
    try {
        let accessToken = localStorage.getItem('wardrobe-access-token');
        if (!accessToken) {
            console.log('No access token found. Please log in again.');
            return null;
        }
        data = await fetchJsonWithToken(url, accessToken, para, method) as any;
        if (data.message === 'not authorized') {
            const refreshToken = localStorage.getItem('wardrobe-refresh-token');
            if (!refreshToken) {
                console.log('No refresh token found. Please log in again.');
                return null;
            }
            try {
                await refreshAccessToken(refreshToken);
                accessToken = localStorage.getItem('wardrobe-access-token');
                if (!accessToken) {
                    console.log('No access token found. Please log in again.');
                    return null;
                }
                data = await fetchJsonWithToken(url, accessToken, para, method);
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                return null;
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
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
