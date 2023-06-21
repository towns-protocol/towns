import { Env } from 'index'
import { Environment } from '../../common'

/*
dev functions to test push notifications
*/
class SqlStatement {
  static SelectPushSubscriptionsLimited =
    'SELECT * FROM PushSubscription LIMIT 20;'
}

export async function getPushSubscriptionsDev(
  env: Environment,
  db: D1Database,
) {
  // for development and testing only. should be disabled in prod
  switch (env) {
    case 'development':
    case 'test': {
      const { results } = await db
        .prepare(SqlStatement.SelectPushSubscriptionsLimited)
        .all()
      return Response.json(results)
    }
    default: {
      console.error(
        '[getPushSubscriptionsDev] Dev function is not allowed for environment',
        env,
      )
      return new Response('Forbidden', { status: 403 })
    }
  }
}

export function getServiceWorkerJsDev(env: Environment) {
  switch (env) {
    case 'development':
    case 'test': {
      return new Response(
        `
      self.addEventListener('push', handlePushNotification)

      function handlePushNotification(event) {
        const notification = event.data.json()
        self.registration.showNotification(
          notification.title,
          notification.options
        )
      }`,
        {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
          },
        },
      )
    }
    default: {
      console.error(
        '[getServiceWorkerJsDev] Dev function is not allowed for environment',
        env,
      )
      return new Response('Forbidden', { status: 403 })
    }
  }
}

export function getDefaultRouteDev(request: Request, env: Env) {
  switch (env.ENVIRONMENT) {
    case 'development':
    case 'test':
      // allow all requests in dev and test
      break
    default: {
      console.error(
        '[getDefaultRouteDev] Dev function is not allowed for environment',
        env,
      )
      return new Response('Forbidden', { status: 403 })
    }
  }

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>Push notifications client</title>
    <style>
      textarea {
        display: block;
        height: 320px;
        width: 480px;
      }
      button {
        margin-right: 10px;
        margin-top: 10px;
        min-width: 32px;
        min-height: 32px;
      }
  </style>  
  <script>
  const VAPID_PUBLIC_KEY = '${env.VAPID_PUBLIC_KEY}'
  const FAKE_USER_ID = 'fake-user-id'
  /* Push notification logic */
  async function registerServiceWorker() {
    try {
      console.log('Registering service worker...');
      await navigator.serviceWorker.register('./service-worker.js')
      console.log('Service worker registered');
    } catch (e) {
      console.error('Service worker registration failed ', e);
    }
    await updateUI();
  }

  async function unregisterServiceWorker() {
    try {
      console.log('Unregistering service worker...');
      const registration = await navigator.serviceWorker.getRegistration();
      registration.unregister();
      console.log('Service worker unregistered');
    } catch (e) {
      console.error('Service worker unregistration failed ', e);
    }
    await updateUI();
  }

  async function subscribeToPush() {
    try {
      console.log('Subscribing to push notifications...');
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('Subscribed to push notifications.');
      console.log('Sending subscription to server...');
      await postToServer('/api/add-subscription', { pushSubscription: subscription, userId: FAKE_USER_ID });
      console.log('Sent subscription to server.');
    } catch (e) {
      console.error('Subscription to push notifications failed ', e);
    }
    await updateUI();
  }

  async function unsubscribeFromPush() {
    try {
      console.log('Unsubscribing from push notifications...');
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      console.log('Sending unsubscribe request to server...');
      postToServer('/api/remove-subscription', { pushSubscription: subscription, userId: FAKE_USER_ID });
      console.log('Sent unsubscribe request to server.');
      console.log('Unsubscribing from push notifications...')
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications.');
    } catch (e) {
      console.error('Unsubscription from push notifications failed ', e);
    }
    await updateUI();
  }

  function notify() {
    alert('Not yet implemented');
  }

  async function updateUI() {
    const output = document.getElementById('output');
    const registerButton = document.getElementById('register');
    const unregisterButton = document.getElementById('unregister');
    const subscribeButton = document.getElementById('subscribe');
    const unsubscribeButton = document.getElementById('unsubscribe');
    const notifyButton = document.getElementById('notify');
    // disable all buttons to begin with
    registerButton.disabled = true;
    unregisterButton.disabled = true;
    subscribeButton.disabled = true;
    unsubscribeButton.disabled = true;
    notifyButton.disabled = true;
    // check if service worker is registered
    if (!('serviceWorker' in navigator)) {
      output.textContent = 'This browser does not support serviceWorker.';
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    // if service worker is not registered, enable register button
    if (!registration) {
      registerButton.disabled = false;
      output.textContent = 'No service worker registered yet.';
      return;
    }
    output.textContent = 'Service worker registered. Scope: ' + registration.scope;
    // subscribe to push notifications
    const subscription = await registration.pushManager.getSubscription();
    // if not subscribed, enable subscribe button
    // user can also unregister service worker
    if (!subscription) {
      subscribeButton.disabled = false;
      unregisterButton.disabled = false;
      output.textContent += 'Ready to subscribe this client to push.';
      return;
    }
    // service worker is registered and subscribed for push
    // enable unsubscribe, unregister, and notify buttons
    unsubscribeButton.disabled = false;
    unregisterButton.disabled = false;
    notifyButton.disabled = false;
  }

  /* Utility functions. */

  // Convert a base64 string to Uint8Array.
  // Must do this so the server can understand the VAPID_PUBLIC_KEY.
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray; 
  }

  async function postToServer(url, data) {
    const bearerToken = btoa('${env.AUTH_SECRET}')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + bearerToken
      },
      body: JSON.stringify(data)
    });
  }

  window.onload = updateUI;
  </script>
  </head>
  <body>
    <noscript>
      <p>Your JavaScript is disabled. This page requires JavaScript to work.</p>
    </noscript>
    <p>Now: ${new Date()}</p>
    <h3>Environment variables:</h3>
    <p>
    <ul>
      <li><code>VAPID public key: VAPID_PUBLIC_KEY</code><.li>
    </ul>
    <h3>Test options:</h3>
    <ul>
      <li><code><a href="/api/get-subscriptions">/api/get-subscriptions/</a></code></li>
      <li><button id="register" type="button" onclick="registerServiceWorker()">Register Service Worker</button></li>
      <li><button id="unregister" type="button" onclick="unregisterServiceWorker()">Unregister Service Worker</button></li>
      <li><button id="subscribe" type="button" onclick="subscribeToPush()">Subscribe to Push Notifications</button></li>
      <li><button id="unsubscribe" type="button" onclick="unsubscribeFromPush()">Unsubscribe from Push Notifications</button></li>
      <li><button id="notify" type="button" onclick="notify()">Trigger Push Notification</button></li>      
    </ul>
    <h3>Output:</h3>
    <textarea id="output" readonly></textarea>
  </body>
  </html>`
  const response = new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
    },
  })
  return response
}
