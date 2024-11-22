# Create River Build App

This package is used to scaffold a new React River app.

## Templates

### Playground Template

By default, the script will create a new app using the Playground template: a full-featured example application.

```bash
yarn create river-build-app my-app
```

### React Templates

It will run `create-vite` to scaffold the project using either `react-ts` or `react` template.

Then, it will install the necessary dependencies: `@river-build/sdk` and `@river-build/react-sdk`.

Finally, it will add the `vite-plugin-node-polyfills` to the `vite.config.ts` file to ensure compatibility with Node.js native modules that are used by the River SDK.

```bash
yarn create river-build-app my-app --template react-ts
```

## Usage

You can use your preferred package manager to run the command.
Example using `yarn`:

```bash
yarn create river-build-app
```

This will create a new React River app in the current directory.

If you want to create a new app in a different directory, you can specify the directory name as an argument:

```bash
yarn create river-build-app my-app
```

You can specify a template using the `-t` or `--template` flag:

```bash
yarn create river-build-app my-app --template react-ts
```

Available templates:

- playground (default)
- react-ts
- react
