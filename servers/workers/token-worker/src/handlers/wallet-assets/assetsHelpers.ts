export async function alchemyRpcCall<T>(
    baseUrl: string,
    method: string,
    params: unknown[],
): Promise<T> {
    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
        }),
    })
    return response.json() as T
}
