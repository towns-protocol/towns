# towns-bot

CLI for creating and managing Towns Protocol bot projects.

## Usage

### Create a new bot project

```bash
npx towns-bot init my-bot
# or
bunx towns-bot init my-bot
# or
yarn dlx towns-bot init my-bot
# or
pnpm dlx towns-bot init my-bot
```

This will create a new bot project with the default quickstart template.

### Available templates

Any template from the [examples](https://github.com/towns-protocol/towns/tree/main/packages/examples) directory can be used.

We currently have the following:

- `quickstart` (default) - Simple starter bot with basic commands

To use a specific template:

```bash
npx towns-bot init my-ai-bot --template quickstart
```

### Update dependencies

Update all `@towns-protocol/*` dependencies to their latest versions:

```bash
npx towns-bot update
```

This command should be run from within a Towns Protocol bot project directory.

## Commands

### `towns-bot init [project-name]`

Create a new bot project.

Options:

- `-t, --template <name>` - Name of template to use

### `towns-bot update`

Update `@towns-protocol/*` dependencies to latest versions.

### `towns-bot help`
