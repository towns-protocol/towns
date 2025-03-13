// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkQueryable} from "contracts/src/factory/facets/wallet-link/interfaces/IWalletLinkQueryable.sol";
import {IDelegateRegistry} from "./interfaces/IDelegateRegistry.sol";

// libraries
import {WalletLinkStorage} from "contracts/src/factory/facets/wallet-link/WalletLinkStorage.sol";
import {WalletLib} from "contracts/src/factory/facets/wallet-link/libraries/WalletLib.sol";
import {WalletLinkLib} from "contracts/src/factory/facets/wallet-link/libraries/WalletLinkLib.sol";
import {LibString} from "solady/utils/LibString.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
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

    if (totalCount == 0) {
      return new WalletData[](0);
    }

    wallets = new WalletData[](totalCount);
    uint256 currentIndex = _processNonEVMWallets(
      wallets,
      0,
      rootWallet,
      nonEVMWallets
    );
    _processLinkedAndDelegatedWallets(
      wallets,
      currentIndex,
      linkedWallets,
      allDelegations,
      ds.rootWalletByRootKey[rootKey].defaultWallet
    );

    return wallets;
  }

  function _processNonEVMWallets(
    WalletData[] memory wallets,
    uint256 startIndex,
    WalletLib.RootWallet storage rootWallet,
    bytes32[] memory nonEVMWallets
  ) private view returns (uint256) {
    uint256 currentIndex = startIndex;
    uint256 nonEVMWalletsLength = nonEVMWallets.length;

    for (uint256 i; i < nonEVMWalletsLength; ++i) {
      WalletLib.Wallet memory nonEVMWallet = rootWallet.walletByHash[
        nonEVMWallets[i]
      ];
      wallets[currentIndex++] = WalletData({
        addr: nonEVMWallet.addr,
        vmType: nonEVMWallet.vmType,
        walletType: WALLET_TYPE_NON_EVM
      });
    }

    return currentIndex;
  }

  function _processLinkedAndDelegatedWallets(
    WalletData[] memory wallets,
    uint256 startIndex,
    address[] memory linkedWallets,
    IDelegateRegistry.Delegation[][] memory allDelegations,
    address defaultWallet
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
      if (wallet == defaultWallet) {
        walletType |= WALLET_TYPE_DEFAULT;
      }

      wallets[currentIndex++] = WalletData({
        addr: LibString.toHexString(wallet),
        vmType: VirtualMachineType.EVM,
        walletType: walletType
      });

      IDelegateRegistry.Delegation[] memory delegations = allDelegations[i];
      uint256 delegationsLength = delegations.length;
      for (
        uint256 j;
        j < delegationsLength && currentIndex < totalLength;
        ++j
      ) {
        if (delegations[j].type_ == IDelegateRegistry.DelegationType.ALL) {
          wallets[currentIndex++] = WalletData({
            addr: LibString.toHexString(delegations[j].from),
            vmType: VirtualMachineType.EVM,
            walletType: WALLET_TYPE_DELEGATED
          });
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

    uint256 linkedWalletsLength = linkedWalletsSet.length();
    uint256 nonEVMWalletsLength = nonEVMWalletsSet.length();

    allDelegations = WalletLinkLib.getDelegationsForWallets(
      linkedWalletsSet.values()
    );

    if (
      linkedWalletsLength == 0 &&
      nonEVMWalletsLength == 0 &&
      allDelegations.length == 0
    ) {
      return (
        0,
        new address[](0),
        new bytes32[](0),
        new IDelegateRegistry.Delegation[][](0)
      );
    }

    linkedWallets = linkedWalletsSet.values();
    nonEVMWallets = nonEVMWalletsSet.values();

    // Calculate total delegations that match ALL type
    uint256 totalDelegations;
    for (uint256 i = 0; i < allDelegations.length; i++) {
      for (uint256 j = 0; j < allDelegations[i].length; j++) {
        if (
          allDelegations[i][j].type_ == IDelegateRegistry.DelegationType.ALL
        ) {
          totalDelegations++;
        }
      }
    }

    totalCount = linkedWalletsLength + nonEVMWalletsLength + totalDelegations;

    return (totalCount, linkedWallets, nonEVMWallets, allDelegations);
  }
}
