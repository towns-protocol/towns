// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {App} from "contracts/src/app/libraries/App.sol";
import {Account} from "contracts/src/app/libraries/Account.sol";

// contracts

library AppRegistryStore {
  // keccak256(abi.encode(uint256(keccak256("app.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xb8e36f5f0889cd57afca29ce4e646d20d1aa88e34a9a72ee2933cbb0fb724d00;

  /// @dev Diamond Storage layout for AppRegistry
  /// @notice Storage Extension Rules:
  /// 1. New variables must be added to the END of structs
  /// 2. Never remove or reorder existing variables
  /// 3. Complex/nested structs should always be stored in mappings for safe upgrades
  struct Layout {
    uint256 nextAppId;
    mapping(string invalidPermission => bool) invalidPermissions;
    mapping(address appAddress => uint256 appId) appIdByAddress;
    mapping(uint256 appId => App.Config registration) registrations;
    mapping(address account => Account.Installation installation) installations;
  }

  function layout() internal pure returns (Layout storage ds) {
    assembly ("memory-safe") {
      ds.slot := STORAGE_SLOT
    }
  }
}
