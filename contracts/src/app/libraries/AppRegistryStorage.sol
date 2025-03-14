// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {Registry} from "../types/AppTypes.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
// contracts

library AppRegistryStorage {
  // keccak256(abi.encode(uint256(keccak256("app.facets.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0xdf7c5666ac6dae19cbbd26e4c45565a209a5c80d04468e41316d166dd7adf900;

  struct Layout {
    uint256 appId;
    StringSet.Set invalidPermissions;
    mapping(uint256 appId => Registry.Config config) configByAppId;
    mapping(uint256 appId => StringSet.Set permissions) permissionsByAppId;
    mapping(address app => uint256 appId) appIdByAddress;
    mapping(bytes32 => bytes) settings;
  }

  function getLayout() internal pure returns (Layout storage ds) {
    assembly {
      ds.slot := STORAGE_SLOT
    }
  }
}
