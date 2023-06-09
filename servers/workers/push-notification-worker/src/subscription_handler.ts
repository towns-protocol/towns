export async function getPushSubscriptions(request: Request, env: Env) {
  // for development  and testing only. should be disabled in prod
  if (request.method === 'GET') {
    if (env.ENVIRONMENT === 'development') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM PushSubscription',
      ).all()
      return Response.json(results)
    }
  }
  return new Response('Not allowed', { status: 404 })
}
