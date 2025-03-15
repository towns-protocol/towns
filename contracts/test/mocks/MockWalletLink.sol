// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {LibString} from "solady/utils/LibString.sol";
// contracts

contract MockWalletLink is IWalletLink {
  using EnumerableSet for EnumerableSet.AddressSet;

  /// @dev flags for wallet type
  uint8 internal constant WALLET_TYPE_LINKED = 1 << 0;
  uint8 internal constant WALLET_TYPE_DELEGATED = 1 << 1;
  uint8 internal constant WALLET_TYPE_DEFAULT = 1 << 2;

  function linkCallerToRootKey(
    LinkedWalletData memory rootWallet,
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
    LinkedWalletData memory wallet,
    LinkedWalletData memory rootWallet,
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

  function getWalletsByRootKeyWithDelegations(
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

  function removeCallerLink() external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();
    address wallet = msg.sender;
    address rootKey = ds.rootKeyByWallet[wallet];
    ds.walletsByRootKey[rootKey].remove(wallet);
    ds.rootKeyByWallet[wallet] = address(0);
  }

  function linkNonEVMWalletToRootKey(
    NonEVMLinkedWalletData calldata wallet,
    uint256
  ) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();
    address rootKey = ds.rootKeyByWallet[msg.sender];
    bytes32 walletHash = keccak256(abi.encode(wallet.addr, wallet.vmType));
    ds.nonEVMWallets[rootKey][walletHash] = true;
  }

  function checkIfNonEVMWalletLinked(
    address rootKey,
    bytes32 walletHash
  ) external view returns (bool) {
    return MockWalletLinkStorage.layout().nonEVMWallets[rootKey][walletHash];
  }

  function removeNonEVMWalletLink(
    string memory addr,
    VirtualMachineType vmType,
    uint256
  ) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();
    address rootKey = ds.rootKeyByWallet[msg.sender];
    bytes32 walletHash = keccak256(abi.encode(addr, vmType));
    ds.nonEVMWallets[rootKey][walletHash] = false;
  }

  function removeLink(
    address wallet,
    LinkedWalletData memory,
    uint256
  ) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();
    address rootKey = ds.rootKeyByWallet[msg.sender];
    ds.walletsByRootKey[rootKey].remove(wallet);
    ds.rootKeyByWallet[wallet] = address(0);
  }

  function explicitWalletsByRootKey(
    address rootKey,
    bool
  ) external view returns (WalletData[] memory walletData) {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();

    address[] memory wallets = ds.walletsByRootKey[rootKey].values();
    walletData = new WalletData[](wallets.length);

    for (uint256 i = 0; i < wallets.length; i++) {
      walletData[i] = WalletData({
        addr: LibString.toHexString(wallets[i]),
        vmType: VirtualMachineType.SVM,
        walletType: WALLET_TYPE_LINKED
      });
    }
    return walletData;
  }

  function setDefaultWallet(address defaultWallet) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();
    ds.defaultWalletByRootKey[msg.sender] = defaultWallet;
  }

  function getDefaultWallet(address rootKey) external view returns (address) {
    return MockWalletLinkStorage.layout().defaultWalletByRootKey[rootKey];
  }

  function setDependency(
    bytes32 dependency,
    address dependencyAddress
  ) external {
    MockWalletLinkStorage.Layout storage ds = MockWalletLinkStorage.layout();
    ds.dependencies[dependency] = dependencyAddress;
  }

  function getDependency(bytes32 dependency) external view returns (address) {
    return MockWalletLinkStorage.layout().dependencies[dependency];
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
    mapping(address => address) defaultWalletByRootKey;
    mapping(address => mapping(bytes32 => bool)) nonEVMWallets;
    mapping(bytes32 => address) dependencies;
  }

  function layout() internal pure returns (Layout storage s) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      s.slot := slot
    }
  }
}
