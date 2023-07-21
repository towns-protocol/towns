export function create204Response() {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204
  return new Response(null, { status: 204 })
}

export function create422Response() {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
  return new Response(null, { status: 204 })
}

export function create400Response(path: string, content: object | null) {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
  console.error(path, 'Bad request', content)
  return new Response('Bad request', {
    status: 400,
  })
}

export function create401Response(path: string) {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
  console.error(path, 'Unauthorized')
  return new Response('Unauthorized', {
    status: 401,
  })
}
