# Create Towns Protocol App

This package is used to scaffold a new React Towns Protocol app.

## Templates

### Playground Template

By default, the script will create a new app using the Playground template: a full-featured example application.

```bash
pnpm create towns-protocol-app my-app
```

### React Templates

It will run `create-vite` to scaffold the project using either `react-ts` or `react` template.

Then, it will install the necessary dependencies: `@towns-protocol/sdk` and `@towns-protocol/react-sdk`.

Finally, it will add the `vite-plugin-node-polyfills` to the `vite.config.ts` file to ensure compatibility with Node.js native modules that are used by the Towns Protocol SDK.

```bash
pnpm create towns-protocol-app my-app --template react-ts
```

## Usage

You can use your preferred package manager to run the command.
Example using `pnpm`:

```bash
pnpm create towns-protocol-app
```

This will create a new React Towns Protocol app in the current directory.

If you want to create a new app in a different directory, you can specify the directory name as an argument:

```bash
pnpm create towns-protocol-app my-app
```

You can specify a template using the `-t` or `--template` flag:

```bash
pnpm create towns-protocol-app my-app --template react-ts
```

Available templates:

- playground (default)
- react-ts
- react
