export function interceptResponseWithMock(
    host: string,
    path: string,
    mockResponse: string,
    method = 'GET',
    contentType?: string,
) {
    const fetchMock = getMiniflareFetchMock()
    // Throw when no matching mocked request is found
    // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
    fetchMock.disableNetConnect()
    const origin = fetchMock.get(host)
    origin
        .intercept({
            method,
            path,
        })
        .reply(200, mockResponse, {
            headers: {
                'Content-Type': contentType || 'text/html; charset=utf-8',
            },
        })
}
