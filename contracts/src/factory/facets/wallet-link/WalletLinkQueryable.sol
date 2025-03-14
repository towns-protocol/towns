// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkQueryable} from "./interfaces/IWalletLinkQueryable.sol";
import {IDelegateRegistry} from "./interfaces/IDelegateRegistry.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {LibString} from "solady/utils/LibString.sol";
import {WalletLib} from "./libraries/WalletLib.sol";
import {WalletLinkLib} from "./libraries/WalletLinkLib.sol";
import {WalletLinkStorage} from "./WalletLinkStorage.sol";

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract WalletLinkQueryable is IWalletLinkQueryable, Facet {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  /// @dev flags for wallet type
  uint8 internal constant WALLET_TYPE_LINKED = 1 << 0;
  uint8 internal constant WALLET_TYPE_DELEGATED = 1 << 1;
  uint8 internal constant WALLET_TYPE_DEFAULT = 1 << 2;
  uint8 internal constant WALLET_TYPE_NON_EVM = 1 << 3;

  function __WalletLinkQueryable_init() external onlyInitializing {
    _addInterface(type(IWalletLinkQueryable).interfaceId);
  }

  function explicitWalletsByRootKey(
    address rootKey
  ) external view returns (WalletData[] memory wallets) {
    // Single storage read for layout
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    WalletLib.RootWallet storage rootWallet = ds.rootWalletByRootKey[rootKey];

    // Get linked wallets, nonEVM wallets and count total delegations
    (
      uint256 totalCount,
      address[] memory linkedWallets,
      bytes32[] memory nonEVMWallets,
      IDelegateRegistry.Delegation[][] memory allDelegations
    ) = _getWalletsAndCount(ds, rootWallet, rootKey);

    if (totalCount == 0) return new WalletData[](0);

    wallets = new WalletData[](totalCount);
    uint256 currentIndex = _processNonEVMWallets(
      rootWallet,
      wallets,
      nonEVMWallets,
      0
    );
    _processLinkedAndDelegatedWallets(
      wallets,
      linkedWallets,
      allDelegations,
      ds.rootWalletByRootKey[rootKey].defaultWallet,
      currentIndex
    );
  }

  function _processNonEVMWallets(
    WalletLib.RootWallet storage rootWallet,
    WalletData[] memory wallets,
    bytes32[] memory nonEVMWallets,
    uint256 startIndex
  ) private view returns (uint256 currentIndex) {
    currentIndex = startIndex;
    uint256 nonEVMWalletsLength = nonEVMWallets.length;

    for (uint256 i; i < nonEVMWalletsLength; ++i) {
      WalletLib.Wallet memory nonEVMWallet = rootWallet.walletByHash[
        nonEVMWallets[i]
      ];
      unchecked {
        WalletData memory data = wallets[currentIndex++];
        data.addr = nonEVMWallet.addr;
        data.vmType = nonEVMWallet.vmType;
        data.walletType = WALLET_TYPE_NON_EVM;
      }
    }
  }

  function _processLinkedAndDelegatedWallets(
    WalletData[] memory wallets,
    address[] memory linkedWallets,
    IDelegateRegistry.Delegation[][] memory allDelegations,
    address defaultWallet,
    uint256 startIndex
  ) private pure {
    uint256 currentIndex = startIndex;
    uint256 linkedWalletsLength = linkedWallets.length;
    uint256 totalLength = wallets.length;

    for (
      uint256 i;
      i < linkedWalletsLength && currentIndex < totalLength;
      ++i
    ) {
      address wallet = linkedWallets[i];

      uint8 walletType = WALLET_TYPE_LINKED;
      if (wallet == defaultWallet) walletType |= WALLET_TYPE_DEFAULT;

      unchecked {
        WalletData memory data = wallets[currentIndex++];
        data.addr = LibString.toHexString(wallet);
        data.vmType = VirtualMachineType.EVM;
        data.walletType = walletType;
      }

      IDelegateRegistry.Delegation[] memory delegations = allDelegations[i];
      uint256 delegationsLength = delegations.length;
      for (
        uint256 j;
        j < delegationsLength && currentIndex < totalLength;
        ++j
      ) {
        if (delegations[j].type_ == IDelegateRegistry.DelegationType.ALL) {
          unchecked {
            WalletData memory data = wallets[currentIndex++];
            data.addr = LibString.toHexString(delegations[j].from);
            data.vmType = VirtualMachineType.EVM;
            data.walletType = WALLET_TYPE_DELEGATED;
          }
        }
      }
    }
  }

  function _getWalletsAndCount(
    WalletLinkStorage.Layout storage ds,
    WalletLib.RootWallet storage rootWallet,
    address rootKey
  )
    private
    view
    returns (
      uint256 totalCount,
      address[] memory linkedWallets,
      bytes32[] memory nonEVMWallets,
      IDelegateRegistry.Delegation[][] memory allDelegations
    )
  {
    EnumerableSet.AddressSet storage linkedWalletsSet = ds.walletsByRootKey[
      rootKey
    ];
    EnumerableSet.Bytes32Set storage nonEVMWalletsSet = rootWallet.walletHashes;

    linkedWallets = linkedWalletsSet.values();
    nonEVMWallets = nonEVMWalletsSet.values();
    uint256 linkedWalletsLength = linkedWallets.length;
    uint256 nonEVMWalletsLength = nonEVMWallets.length;

    allDelegations = WalletLinkLib.getDelegationsForWallets(linkedWallets);
    uint256 allDelegationsLength = allDelegations.length;

    if (
      !(linkedWalletsLength == 0 &&
        nonEVMWalletsLength == 0 &&
        allDelegationsLength == 0)
    ) {
      // Calculate total delegations that match ALL type
      uint256 totalDelegations;
      for (uint256 i; i < allDelegationsLength; ++i) {
        IDelegateRegistry.Delegation[] memory delegations = allDelegations[i];
        uint256 delegationsLength = delegations.length;
        for (uint256 j; j < delegationsLength; ++j) {
          if (delegations[j].type_ == IDelegateRegistry.DelegationType.ALL) {
            unchecked {
              ++totalDelegations;
            }
          }
        }
      }

      totalCount = linkedWalletsLength + nonEVMWalletsLength + totalDelegations;
    }
  }
}
