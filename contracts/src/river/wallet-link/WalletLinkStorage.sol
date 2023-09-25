// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";

// libraries

// contracts
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library WalletLinkStorage {
  bytes32 constant STORAGE_SLOT =
    keccak256("river.wallet-link.WalletLinkStorage");

  struct Layout {
    /// @notice The global delegation mapping
    /// @dev wallet -> wallet version -> rootKeyHash
    mapping(address => mapping(uint256 => EnumerableSet.Bytes32Set)) links;
    /// @notice A mapping of wallets to versions (for cheap revocation)
    mapping(address => uint256) walletVersion;
    /// @notice A mapping of wallets to delegates to versions (for cheap revocation)
    mapping(address => mapping(address => uint256)) rootKeyVersion;
    /// @notice A secondary mapping to return onchain enumerability of links that a given address can perform
    /// @dev wallet -> rootKeyHashes
    mapping(address => EnumerableSet.Bytes32Set) rootKeyHashes;
    /// @notice A secondary mapping used to return delegation information about a delegation
    /// @dev rootKeyHash -> delegationInfo
    mapping(bytes32 => IWalletLinkBase.WalletLinkInfo) rootKeyInfo;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
