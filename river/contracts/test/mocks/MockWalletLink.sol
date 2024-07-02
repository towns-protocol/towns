// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

contract MockWalletLink is IWalletLinkBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  function linkCallerToRootKey(
    LinkedWallet memory rootWallet,
    uint256
  ) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();

    // The caller is the wallet that is being linked to the root wallet
    address newWallet = msg.sender;

    //set link in mapping
    ds.walletsByRootKey[rootWallet.addr].add(newWallet);
    ds.rootKeyByWallet[newWallet] = rootWallet.addr;
  }

  function linkWalletToRootKey(
    LinkedWallet memory wallet,
    LinkedWallet memory rootWallet,
    uint256
  ) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();

    //set link in mapping
    ds.walletsByRootKey[rootWallet.addr].add(wallet.addr);
    ds.rootKeyByWallet[wallet.addr] = rootWallet.addr;
  }

  function getWalletsByRootKey(
    address rootKey
  ) external view returns (address[] memory wallets) {
    return MockWalletLinkStorage.layout().walletsByRootKey[rootKey].values();
  }

  function getRootKeyForWallet(
    address wallet
  ) external view returns (address rootKey) {
    return MockWalletLinkStorage.layout().rootKeyByWallet[wallet];
  }

  function checkIfLinked(
    address rootKey,
    address wallet
  ) external view returns (bool) {
    return MockWalletLinkStorage.layout().rootKeyByWallet[wallet] == rootKey;
  }

  function getLatestNonceForRootKey(address) external pure returns (uint256) {
    return 0;
  }
}

library MockWalletLinkStorage {
  // keccak256(abi.encode(uint256(keccak256("river.mock.wallet.link.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0x53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb00;

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
