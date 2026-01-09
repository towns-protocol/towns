---
"@towns-protocol/contracts": patch
---

Replace DI pattern with self-deploying CREATE2 pattern to eliminate
version mismatch risk between CreateSpaceFacet and SpaceProxyInitializer.

- Add _getOrDeployProxyInitializer() to CreateSpaceBase using CREATE2
- Use compile-time keccak256(type(SpaceProxyInitializer).creationCode)
- Move getProxyInitializer() from Architect to CreateSpaceFacet
- Remove setProxyInitializer() from Architect
- Mark proxyInitializer storage slot as deprecated
- Remove SpaceFactoryInit contract (no longer needed)
- Remove DeploySpaceProxyInitializer script
- Update deployment scripts and tests
- Use CustomRevert for gas-efficient error handling
- Merge ArchitectBase into Architect
