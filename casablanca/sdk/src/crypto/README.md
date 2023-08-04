# Olm/Megolm Encryption

Code in this directory consumes `@river/mecholm` package (wrapper around matrix-org/olm wasm olm/megolm encryption primitives - see https://gitlab.matrix.org/matrix-org/olm) and ports over code largely unchanged from matrix-js-sdk v25.0.0 crypto module (see: https://github.com/matrix-org/matrix-js-sdk/tree/develop/src/crypto). It's the intention that code in this sub-directory is consumed by instantiating a Crypto class (see crypto.ts), and initializing it. This will create the necessary device key pairs and initialize the device with an Olm account. Thereafter, the device can create ephemeral Olm sessions to encrypt / decrypt p2p messages. Please be aware, there are add-on e2e encryption features that have not yet been ported over or implemented but are available in matrix-js-sdk. Those features are listed below as of 06/30/23:

- device verification
- cross-signing of user keys
- secure secret storage for storing cross-signing pk's on server
- Megolm implementation in /algorithms implementing EncryptionAlgorithm (see algorithms/base.ts) for Megolm.

# Maintenance

In translating the crypto codebase from matrix-org and conforming it to our unique needs, we've started making improvements and changes to pass our eslint checks in CI that run on code in the Harmony repo. You'll notice the code still has legacy patterns employed such as promise chaining as oppose to await..async syntax, which makes it harder to reason about return values along the way. There are todos in the codebase that illustrate specific areas we should address in future improvement PRs.

As the underlying low level matrix-org/olm wasm library evolves, mecholm which the sdk and this codebase depends on my drift in compatibility. We'll need to keep an eye on that and update mecholm library as well as artifacts under this sub-directory as needed and in particular as our tests start failing in CI.
