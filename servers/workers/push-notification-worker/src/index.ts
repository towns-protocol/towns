/**
 *
 * - Run `yarn dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import {
  Environment,
  getOptionsResponse,
  withCorsHeaders,
  appendCorsHeaders,
  isAllowedOrigin,
  AuthEnv,
} from '../../common'

import apiRouter from './router'

export interface Env extends AuthEnv {
  ENVIRONMENT: Environment
  DB: D1Database
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
}

// The fetch handler is invoked when this worker receives a HTTP(S) request
// and should return a Response (optionally wrapped in a Promise)
export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  switch (request.method) {
    case 'OPTIONS':
      return getOptionsResponse(request, env.ENVIRONMENT)
    case 'GET':
    case 'POST':
    case 'PUT':
    case 'DELETE':
      try {
        if (isAllowedOrigin(request, env.ENVIRONMENT)) {
          // handle the request
          const response = (await apiRouter.handle(
            request,
            env,
            ctx,
          )) as Response
          // add CORS headers
          return appendCorsHeaders(
            response,
            withCorsHeaders(request, env.ENVIRONMENT),
          )
        } else {
          return new Response('Forbidden', {
            status: 403,
            headers: withCorsHeaders(request, env.ENVIRONMENT),
          })
        }
      } catch (e) {
        console.error('[worker]', e)
        let errMsg = ''
        switch (env.ENVIRONMENT) {
          case 'production':
            // hide detail message for production
            errMsg = 'Oh oh... our server has an issue. Please try again later.'
            break
          default:
            errMsg = JSON.stringify(e)
            break
        }
        return new Response(errMsg, {
          status: 500, // Internal Server Error
          headers: withCorsHeaders(request, env.ENVIRONMENT),
        })
      }
    default:
      return new Response('Method not allowed', {
        status: 405, // Method Not Allowed
        headers: withCorsHeaders(request, env.ENVIRONMENT),
      })
  }
}

// Export a default object containing event handlers
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handleRequest(request, env, ctx)
  },
}
