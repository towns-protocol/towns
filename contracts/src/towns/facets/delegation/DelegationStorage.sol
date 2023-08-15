// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDelegationBase} from "./IDelegation.sol";

// libraries

// contracts
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library DelegationStorage {
  bytes32 constant STORAGE_SLOT =
    keccak256("towns.facets.delegation.DelegationStorage");

  struct Layout {
    /// @notice The global delegation mapping
    /// @dev vault -> vault version -> delegationHash
    mapping(address => mapping(uint256 => EnumerableSet.Bytes32Set)) delegations;
    /// @notice A mapping of wallets to versions (for cheap revocation)
    mapping(address => uint256) vaultVersion;
    /// @notice A mapping of wallets to delegates to versions (for cheap revocation)
    mapping(address => mapping(address => uint256)) delegateVersion;
    /// @notice A secondary mapping to return onchain enumerability of delegations that a given address can perform
    /// @dev vault -> delegationHashes
    mapping(address => EnumerableSet.Bytes32Set) delegationHashes;
    /// @notice A secondary mapping used to return delegation information about a delegation
    /// @dev delegationHash -> delegationInfo
    mapping(bytes32 => IDelegationBase.DelegationInfo) delegationInfo;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
