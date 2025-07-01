# @towns-protocol/generated

## JavaScript Compilation for Node.js ESM

**⚠️ Important:** This package compiles TypeScript to JavaScript to support Node.js ESM imports.

### The Problem
Node.js ESM requires `.js` files for imports. The imports like:
```ts
import { DropFacet__factory } from "@towns-protocol/generated/dev/typings/factories/DropFacet__factory";
```
Would fail because Node.js looks for `DropFacet__factory.js` but only `DropFacet__factory.ts` existed.

### The Solution
We compile TypeScript to JavaScript using `tsc` and use exports field mapping:
```json
{
  "exports": {
    "./dev/typings/factories/*": "./dist/dev/typings/factories/*.js",
    "./dev/typings/*": "./dist/dev/typings/*.js"
  }
}
```

### Usage
Import normally - the exports field maps to compiled `.js` files:
```ts
import { DropFacet__factory } from "@towns-protocol/generated/dev/typings/factories/DropFacet__factory";
import { IPricingModulesBase } from "@towns-protocol/generated/dev/typings/IPricingModules";
```

### Building
Run `yarn build` to compile TypeScript files to JavaScript with proper module resolution.

## How to generate contract types

From the root of the repo, run:

```bash
./scripts/build-contract-types.sh
```

## What are deployments?

Deployments are a group of contracts on multiple chains that together make up a river environment

In order to deploy, run the following command from the repo root

```bash
./scripts/deploy-contracts.sh --e single
```

## Addresses

One off contracts that are important to the ecosystem at large