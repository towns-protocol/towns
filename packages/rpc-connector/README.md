# @towns-protocol/rpc-connector

This package is a wrapper around `@connectrpc/connect-node` and `@connectrpc/connect-web`.
We need this wrapper so we can properly bundle SDK for the web and node, relying on `package.json` exports to solve the correct import path.

> [!IMPORTANT]  
> This package require the caller to have `@connectrpc/connect-node` or `@connectrpc/connect-web` installed, depending on the environment.
