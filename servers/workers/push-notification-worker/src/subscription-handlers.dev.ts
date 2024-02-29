import { Mute } from './types'

import { Env } from './index'

/*
dev functions to test push notifications
*/

export function getServiceWorkerJsDev(env: Env) {
  switch (env.ENVIRONMENT) {
    case 'development':
    case 'test': {
      return new Response(
        `
        self.addEventListener('push', handlePushNotification);
        
        function handlePushNotification(event) {
          console.log('handlePushNotification', event);
          let title = 'No title';
          let options = {
            body: 'no body',
          };
          try {
            const data = event.data.json();
            const notification = data.content
            console.log('notification', notification);
            title = notification.channelId;
            options.body = JSON.stringify(notification);
          } catch (e) {
            console.error('handlePushNotification', e);
            title = 'Error';
            body = e.message;
          }
          self.registration.showNotification(
            title,
            options,
          );
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
        env.ENVIRONMENT,
      )
      return new Response('Forbidden', { status: 403 })
    }
  }

  const ALICE_ID = '0xAlice'
  const BOB_ID = '0xBob'
  const SPACE_ID = '!spaceId-1'
  const CHANNEL_ID = '!channelId-1'
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>Push notifications client</title>
    <style>
      h3 {
        padding-top: 10px;
        padding-bottom: 0px;
        margin: 5px;
      }
      textarea {
        display: block;
        height: 240px;
        width: 640px;
        margin: 5px;
      }
      button {
        margin-right: 10px;
        margin-top: 5px;
        margin-bottom: 5px;
        min-width: 32px;
        min-height: 32px;
      }
  </style>  
  <script>
  const VAPID_PUBLIC_KEY = '${env.VAPID_PUBLIC_KEY}';
  /* Push notification logic */
  async function registerServiceWorker() {
    try {
      console.log('Registering service worker...');
      await navigator.serviceWorker.register('./service-worker.js');
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
      await sendToServer('/api/add-subscription', 'POST', { subscriptionObject: subscription, userId: '${ALICE_ID}' });
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
      await sendToServer('/api/remove-subscription', 'POST', { subscriptionObject: subscription, userId: '${ALICE_ID}' });
      await sendToServer('/api/remove-subscription', 'POST', { subscriptionObject: subscription, userId: '${BOB_ID}' });
      console.log('Sent unsubscribe request to server.');
      console.log('Unsubscribing from push notifications...')
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications.');
    } catch (e) {
      console.error('Unsubscription from push notifications failed ', e);
    }
    await updateUI();
  }

  async function notify() {
    const output = document.getElementById('output');
    const titleText = document.getElementById('notificationTitle');
    const bodyText = document.getElementById('notificationBody');
    const forceNotify = document.getElementById('forceNotify');
    const payload = {
      content: {
        kind: 'mention',
        spaceId: '${SPACE_ID}',
        channelId: '${CHANNEL_ID}',
        senderId: '${ALICE_ID}',
        event: {},
      },
    };
    const notifyParams = {
      sender: '${ALICE_ID}',
      //users: ['${ALICE_ID}', ${BOB_ID}],
      users: ['${ALICE_ID}'], // send to self
      payload,
      forceNotify: forceNotify.checked,
    };
    try {
      console.log('Sending notification to server... forceNotify:' + forceNotify.checked);
      await sendToServer('/api/notify-users', 'POST', notifyParams);
      console.log('Sent notification to server.');
      output.textContent += '\\n' + 'Notification sent:' + '\\n' + payload;
    } catch (e) {
      console.error('Sending notification to server failed ', e);
    }
  }

  async function saveSettings() {
    const output = document.getElementById('output');
    const settingsText = document.getElementById('notificationSettingsBody');
    const saveSettingsParams = toJsonFromString(settingsText.value);
    if (!saveSettingsParams) {
      output.textContent += '\\n' + 'Invalid JSON:\\n' + settingsText.value + '\\n';
      return;
    }
    try {
      console.log('Saving notification settings...');
      const response = await sendToServer('/api/notification-settings', 'PUT', saveSettingsParams);
      console.log('saveSettings response', response)
      if (response.status >= 200 && response.status < 300) {
        console.log('Saved notification settings.');
        output.textContent += '\\nNotification settings saved.\\n';
      } else {
        console.error('Saving notification settings failed ', response);
        output.textContent += '\\nSaving notification settings failed:\\n' + '{ status: ' + response.status + ', text: ' + response.statusText + ' }\\n';
      }
    } catch (e) {
      console.error('Saving notfication settings failed ', e);
    }
  }

  async function getSettings() {
    const output = document.getElementById('output');
    const userId = '${ALICE_ID}';
    const getSettingsParams = {
      userId,
    }
    try {
      console.log('Getting notification settings for ' + userId);
      const response = await sendToServer('/api/get-notification-settings', 'POST', getSettingsParams);
      console.log('getSettings response', response)
      if (response.status >= 200 && response.status < 300) {
        console.log('Got notification settings for ' + userId);
        const settings = await response.json();
        output.textContent = 'Notification settings for ' + userId +':\\n' + JSON.stringify(settings, null, 2) + '\\n';
      } else {
        console.error('Getting notification settings failed ', response);
        output.textContent += '\\nGetting notification settings failed:\\n' + '{ status: ' + response.status + ', text: ' + response.statusText + ' }\\n';
      }
    } catch (e) {
      console.error('Attempt to get notfication settings failed ', e);
    }
  }

  async function deleteSettings() {
    const output = document.getElementById('output');
    const deleteSettingsParams = {
      userId: '${ALICE_ID}',
    }
    try {
      console.log('Deleting notification settings for ${ALICE_ID}...');
      const response = await sendToServer('/api/notification-settings', 'DELETE', deleteSettingsParams);
      console.log('deleteSettings response', response)
      if (response.status >= 200 && response.status < 300) {
        console.log('Deleted notification settings for ${ALICE_ID}');
        output.textContent = 'Deleted notification settings for ${ALICE_ID}\\n';
      } else {
        console.error('Deleting notification settings failed ', response);
        output.textContent += '\\nDeleting notification settings failed:\\n' + '{ status: ' + response.status + ', text: ' + response.statusText + ' }\\n';
      }
    } catch (e) {
      console.error('Attempt to delete notfication settings failed ', e);
    }
  }

  function toJsonFromString(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.error('Parsing JSON failed ', e);
      return null;
    }
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
      console.log('Ready to subscribe this client to push.');
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

  async function sendToServer(url, method, data) {
    const bearerToken = btoa('${env.AUTH_SECRET}')
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + bearerToken
      },
      body: JSON.stringify(data)
    });
    return response;
  }

  function clearOutput() {
    const output = document.getElementById('output');
    output.textContent = '';
  }

  window.onload = updateUI;
  </script>
  </head>
  <body>
    <noscript>
      <p>Your JavaScript is disabled. This page requires JavaScript to work.</p>
    </noscript>
    Now: ${new Date()}
    <h3 padding-bottom='1em'>Environment variables:</h3>
    <ul>
      <li><code>VAPID public key: ${env.VAPID_PUBLIC_KEY}</code></li>
    </ul>
    <h3>Register / unregister Service Worker</h3>
    <button id="register" type="button" onclick="registerServiceWorker()">Register Service Worker</button>
    <button id="unregister" type="button" onclick="unregisterServiceWorker()">Unregister Service Worker</button>
    <h3>Subscribe to / unsubscribe from Push notification</h3>
    <button id="subscribe" type="button" onclick="subscribeToPush()">Subscribe to Push Notifications</button>
    <button id="unsubscribe" type="button" onclick="unsubscribeFromPush()">Unsubscribe from Push Notifications</button>
    <h3>Trigger Push Notification</h3>
      <label for="title">Title:</label>
      <input type="text" id="notificationTitle" size="40" value="Hello Notifications!">
      <button id="notify" type="button" onclick="notify()">Trigger Push Notification</button>
      <label for="forceNotify">Force notify:</label>
      <input type="checkbox" id="forceNotify" name="forceNotify" checked>
      <br><label for="notificationBody">Body:</label>
      <br><textarea id="notificationBody">{ spaceId: '${SPACE_ID}', channelId: '${CHANNEL_ID}' }' }</textarea>
    <h3>Settings test area</h3>
    <button id="saveSettings" type="button" onclick="saveSettings()">Save Settings</button>
    <button id="getSettings" type="button" onclick="getSettings()">Get Settings</button>
    <button id="deleteSettings" type="button" onclick="deleteSettings()">Delete Settings</button>
    <br><textarea id="notificationSettingsBody">
{
    "userSettings": {
      "userId": "${ALICE_ID}",
      "directMessage": "true",
      "mention": "true",
      "replyTo": "true",
      "spaceSettings": [{   "spaceId": "${SPACE_ID}", "spaceMute": "${
    Mute.Default
  }" }],
      "channelSettings": [{ "spaceId": "${SPACE_ID}", "channelId": "${CHANNEL_ID}", "channelMute": "${
    Mute.Default
  }" }]
    }
}    
    </textarea>
    <h3>Output</h3>
    <button id="clearOutput" type="button" onclick="clearOutput()">Clear</button>
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
