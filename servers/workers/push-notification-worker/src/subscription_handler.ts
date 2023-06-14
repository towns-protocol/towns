import { Env } from './worker'

export async function getPushSubscriptions(request: Request, env: Env) {
  // for development and test only. should be disabled in prod
  switch (env.ENVIRONMENT) {
    case 'development':
    case 'test': {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM PushSubscription',
        ).all()
        return Response.json(results)
      } else {
        return new Response('Not allowed', {
          status: 405, // // Method Not Allowed
        })
      }
    }
    default:
      return new Response('Not allowed', { status: 404 })
  }
}
