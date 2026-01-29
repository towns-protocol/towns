# @towns-protocol/contracts

## 1.0.4

### Patch Changes

- [#4864](https://github.com/towns-protocol/towns/pull/4864) [`9b7ae6f`](https://github.com/towns-protocol/towns/commit/9b7ae6f61c8b13c33dfb2cbcb5833401c3578ff0) Thanks [@shuhuiluo](https://github.com/shuhuiluo)! - Optimize TippingBase with assembly calldata decoding, add bounds check, and fuzz tests for decode equivalence.

## 1.0.3

## 1.0.2

### Patch Changes

- [#4848](https://github.com/towns-protocol/towns/pull/4848) [`202c5f8`](https://github.com/towns-protocol/towns/commit/202c5f881953f5efe3706ea876f23eb180f0194a) Thanks [@shuhuiluo](https://github.com/shuhuiluo)! - Replace DI pattern with self-deploying CREATE2 pattern to eliminate
  version mismatch risk between CreateSpaceFacet and SpaceProxyInitializer.
  - Add \_getOrDeployProxyInitializer() to CreateSpaceBase using CREATE2
  - Use compile-time keccak256(type(SpaceProxyInitializer).creationCode)
  - Move getProxyInitializer() from Architect to CreateSpaceFacet
  - Remove setProxyInitializer() from Architect
  - Mark proxyInitializer storage slot as deprecated
  - Remove SpaceFactoryInit contract (no longer needed)
  - Remove DeploySpaceProxyInitializer script
  - Update deployment scripts and tests
  - Use CustomRevert for gas-efficient error handling
  - Merge ArchitectBase into Architect

- [#4847](https://github.com/towns-protocol/towns/pull/4847) [`af5d60e`](https://github.com/towns-protocol/towns/commit/af5d60e5f522b0ea6285ff1c16482ea1678575da) Thanks [@shuhuiluo](https://github.com/shuhuiluo)! - Added a cap re-validation in \_onEntitlementCheckResultPosted() before minting. If the cap is reached, the pending join is rejected and the user is refunded.

## 1.0.1
