# Group encryption package for the River protocol

This package contains the end-to-end group encryption implemented for the River
protocol.

For more details, visit the following websites:

- River documentation: <https://docs.river.build/introduction>
- River Encryption documentation: <https://docs.river.build/concepts/encryption>
- GitHub repository: <git+https://github.com/river-build/river-stage.git>
- bugs: <https://github.com/river-build/river-stage/issues>

## Simple nodeJs app

This is a simple 'hello world' app that demonstrates how to import and use
the package. It imports the `@river-build/encryption` package and the peer
dependency package (matrix/olm double ratchet library).

### package.json

```json
{
  "name": "test-river-encryption",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "packageManager": "yarn@1.22.22+sha1.ac34549e6aa8e7ead463a7407e1c7390f61a6610",
  "scripts": {
    "build": "tsc",
    "cb": "yarn clean && yarn && yarn build",
    "clean": "rm -rf bin && rm -rf node_modules",
    "dev": "yarn cb && yarn start",
    "start": "node --trace-warnings --experimental-vm-modules --experimental-wasm-modules bin/index.js"
  },
  "dependencies": {
    "@matrix-org/olm": "^3.2.15",
    "@river-build/encryption-pkg": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.3"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": true,
    "esModuleInterop": true,
    "lib": ["esnext", "dom"],
    "module": "esnext",
    "moduleResolution": "node",
    "noImplicitAny": true,
    "outDir": "./bin",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "target": "esnext"
  },
  "include": ["./src/**/*.ts", "*/.src/*.js", "./src/*.wasm"]
}
```

### hello world app

This script shows how to import the package and do a simple encryption &
decryption operation. A more advanced tutorial that shows how to perform
an end-to-end group encryption will be shared later.

```typescript
import { EncryptionDelegate } from "@river-build/encryption-pkg";
import Olm from "@matrix-org/olm";

type OlmLib = typeof Olm;

async function useEncryptionPackage(): Promise<void> {
  const delegate = new EncryptionDelegate(Olm);
  await delegate.init();

  const outboundSession = delegate.createOutboundGroupSession();
  outboundSession.create();

  const exportedSession = outboundSession.session_key();
  const inboundSession = delegate.createInboundGroupSession();
  inboundSession.create(exportedSession);

  const encrypted = outboundSession.encrypt("have a bite of the sweet apple");
  console.log("encrypted:", encrypted);
  const decrypted = inboundSession.decrypt(encrypted);
  console.log("decrypted:", decrypted);
}

async function main() {
  console.log("Hello World");
  try {
    await useEncryptionPackage();
  } catch (e) {
    console.error(e);
  }
}

await main();
```
