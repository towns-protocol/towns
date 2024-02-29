export const fetchLocalAuthz = (newRequest: Request, newRequestInit: RequestInit) => {
    const url = new URL('http://localhost:8005')
    url.hostname = 'localhost'
    const localRequest = newRequest.clone() //new Request(url.toString(), new Request(newRequest))
    if (newRequestInit.body) {
        localRequest.headers.delete('Content-length')
        localRequest.headers.set('Content-length', newRequestInit.body.toString().length.toString())
    }
    return fetch(url, localRequest)
}
