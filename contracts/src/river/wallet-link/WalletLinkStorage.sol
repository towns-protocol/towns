// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library WalletLinkStorage {
  bytes32 constant STORAGE_SLOT =
    keccak256("river.wallet-link.WalletLinkStorage");

  struct Layout {
    // mapping RootKeys to Ethereum Wallets is a 1 to many relationship, a root key can have many wallets
    mapping(address => EnumerableSet.AddressSet) rootKeysToWallets;
    // mapping Ethereum Wallets to RootKey is a 1 to 1 relationship, a wallet can only be linked to 1 root key
    mapping(address => address) walletsToRootKey;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
