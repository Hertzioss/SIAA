

export async function getStrapiData(url: string) {

    const BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

    try {
        const res = await fetch(`${BASE_URL}${url}`)

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
        }
        const data = await res.json();
        return data;

    } catch (error) {
        console.error('Error fetching data from Strapi:', error);
        return null;
    }
}

export async function postStrapiData(url: string, data: object) {
    const BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
        }
        const result = await res.json();
        return result;

    } catch (error) {
        console.error('Error fetching data from Strapi:', error);
        return null;
    }
}

export async function putStrapiData(url: string, data: object) {
    const BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
        }
        const result = await res.json();
        return result;

    } catch (error) {
        console.error('Error fetching data from Strapi:', error);
        return null;
    }
}

export async function deleteStrapiData(url: string) {
    const BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;

    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method: 'DELETE',
        })

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
        }
        const result = await res.json();
        return result;

    } catch (error) {
        console.error('Error fetching data from Strapi:', error);
        return null;
    }
}



