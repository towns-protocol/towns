// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {DataTypes} from "./IAppRegistry.sol";

// contracts

library AppRegistryStorage {
  // keccak256(abi.encode(uint256(keccak256("towns.facets.app.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant SLOT_POSITION =
    0x37d9d351893e940704c6ada850e5696d62dd65fd8b2112885b386f259d41ca00;

  struct Layout {
    mapping(bytes32 uid => DataTypes.Schema schema) schemas;
    mapping(bytes32 uid => DataTypes.Attestation attestation) attestations;
    mapping(address recipient => mapping(address attester => bytes32 uid)) recipientToAttesterToAttestation;
    mapping(address account => DataTypes.TrustedAttester trustedAttester) trustedAttesters;
  }

  function getLayout() internal pure returns (Layout storage ds) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := SLOT_POSITION
    }
  }
}
