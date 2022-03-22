# HARMONY WEB CLIENT

## Setup

1. Install dependencies by running yarn install

```
yarn install
```

2. Start local server by typing the following. Instructions to open the browser
   on `localhost:3000` should follow.

```
yarn dev
```

3. Recommended VSCode Plugins

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Storybook

Storybook can be used to preview and test components in an isolated
environnement.

```
yarn storybook
```

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
