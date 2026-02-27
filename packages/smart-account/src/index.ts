// @towns-protocol/smart-account
//
// Subpath imports are available for tree-shaking:
//   import { toTownsSmartAccount } from '@towns-protocol/smart-account/create2'
//   import { discoverAccount } from '@towns-protocol/smart-account/id'
//   import { needsUpgrade, encodeUpgrade } from '@towns-protocol/smart-account/upgrade'
//
// Re-exports below are for legacy packages using moduleResolution: "node"
// which doesn't support subpath exports.

export * from './types'

// Re-export all modules for legacy compatibility
export * from './create2'
export * from './id'
export * from './upgrade'
export * from './abis'
