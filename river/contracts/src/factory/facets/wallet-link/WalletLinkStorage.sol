// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library WalletLinkStorage {
  // keccak256(abi.encode(uint256(keccak256("river.wallet.link.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0x19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc00;

  struct Layout {
    // mapping RootKeys to Ethereum Wallets is a 1 to many relationship, a root key can have many wallets
    mapping(address => EnumerableSet.AddressSet) walletsByRootKey;
    // mapping Ethereum Wallets to RootKey is a 1 to 1 relationship, a wallet can only be linked to 1 root key
    mapping(address => address) rootKeyByWallet;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
