# HARMONY WEB CLIENT

## Setup

1. Install dependencies by running yarn install

```
yarn install
```

2. Copy `.env.local-sample` to `.env.local` and update.

3. Start local server by typing the following. Instructions to open the browser
   on `localhost:3000` should follow.

```
yarn dev
```

> Note: Experimental project wide error diagnostics (defined in
> `.vscode/settings.json`) will only be available if project is openened from
> `clients/web/app` as root.

4. Recommended VSCode Plugins

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Testing Push notifications locally on mobile devices

1. Set up a [cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-and-setup/tunnel-guide/remote/) using the cf dashboard. Once the tunnel is set up, you need to set up hostnames for 4 services. Each hostname's subdomain should be set with a common phrase of your choosing exactly as described below (I suggest your name). For this example, let's use `star`

   - subdomain: `star-app`, domain: `towns.com`, service type: `http`, service url: `localhost:3000`
   - subdomain: `star-dendrite`, domain: `towns.com`, service type: `http`, service url: `localhost:8008`
   - subdomain: `star-anvil`, domain: `towns.com`, service type: `http`, service url: `localhost:8545`
   - subdomain: `star-pnw`, domain: `towns.com`, service type: `http`, service url: `localhost:8787`

   To verify that the tunnels are working, you can run just the the app locally and visit `star-app.towns.com` in your browser. You should see the app running.

2. You also have to set the `VITE_CF_TUNNEL_PREFIX` in `.env.local` to the same phrase. Note that setting this flag is going to lock your dev environment to using tunnels for the services listed above. So your core url, blockchain network, etc, will not be able to be swapped to other urls/networks while developing.
3. On your mobile wallet, you need to add a the foundry network via the tunnel url. Make sure anvil is running. Then add the network with the same settings you added via desktop, except the RPC url is going to be the tunnel - `star-anvil.towns.com`.
4. On your mobile device, you should now be able to visit `star-app.towns.com` and complete the connect/login process. Once you enable push notifications, you should be able to receive them on your mobile device. It's not required to connect your device to your machine, but you'll need to do so to debug any logs.

## Installation log

- ViteJS

https://vitejs.dev/guide/#scaffolding-your-first-vite-project

- ViteJS Plugins:

  - [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) -
    provides fast refresh, JSX runtime
  - [vite-plugin-eslint](https://www.npmjs.com/package/vite-plugin-eslint)
    provides eslint warnings in console
  - [vite-tsconfig-paths](https://www.npmjs.com/package/vite-tsconfig-paths) -
    Implicit path mapping from tsconfig (aligns vscode, vite and storybook)
  - [@vanilla-extract/vite-plugin](https://www.npmjs.com/package/@vanilla-extract/vite-plugin)
    generates static stylesheets from `.css.ts` files

- Eslint + Create React App base config

https://www.npmjs.com/package/eslint-config-react-app

- Storybook + ViteJS setup

https://github.com/eirslett/storybook-builder-vite

- Vanilla Extract

zero-runtime stylesheets used by base design system

https://vanilla-extract.style/documentation/setup/#vite

- Storybook (ViteJS)

https://storybook.js.org/blog/storybook-for-vite/
