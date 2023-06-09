/**
 *
 * - Run `yarn dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { getPushSubscriptions } from './subscription_handler'

// Export a default object containing event handlers
export default {
  // The fetch handler is invoked when this worker receives a HTTP(S) request
  // and should return a Response (optionally wrapped in a Promise)
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
    const url = new URL(request.url)

    switch (url.pathname) {
      case '/api/push_subscriptions':
        return getPushSubscriptions(request, env)
    }

    return new Response(
      `Now: ${new Date()}
			<ul>
      <li><code><a href="/api/push_subscriptions">/api/push_subscriptions/</a></code></li>
			</ul>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
}
