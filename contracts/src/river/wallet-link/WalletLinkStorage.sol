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
    // mapping RootKeys to Ethereum Wallets is a 1 to many relationship, a root key can have many wallets
    mapping(address => address[]) rootKeysToWallets;
    // mapping Ethereum Wallets to RootKeys is a 1 to 1 relationship, a wallet can only be linked to 1 root key
    mapping(address => address) walletsToRootKeys;
    //mapping that stores all nonces used by a given root key
    mapping(address => uint64) rootKeysToHighestNonce;
    //mapping that stores all nonces used by a wallet for removing from a root key
    mapping(address => uint64) walletsToHighestRemoveNonce;
    //mapping that stores all nonces used by a rootkey for removing a wallet from it
    mapping(address => uint64) rootKeysToHighestRemoveNonce;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
