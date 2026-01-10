// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "./IWalletLink.sol";

// libraries
import {WalletLib} from "./libraries/WalletLib.sol";
// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {WalletLinkBase} from "./WalletLinkBase.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract WalletLink is IWalletLink, WalletLinkBase, OwnableBase, Facet {
    function __WalletLink_init(address sclEip6565) external onlyInitializing {
        _addInterface(type(IWalletLink).interfaceId);
        _setDependency(SCL_EIP6565, sclEip6565);
    }

    /// @inheritdoc IWalletLink
    function linkCallerToRootKey(LinkedWallet calldata rootWallet, uint256 nonce) external {
        _linkCallerToRootWallet(rootWallet, nonce);
    }

    /// @inheritdoc IWalletLink
    function linkWalletToRootKey(
        LinkedWallet calldata wallet,
        LinkedWallet calldata rootWallet,
        uint256 nonce
    ) external {
        _linkWalletToRootWallet(wallet, rootWallet, nonce);
    }

    /// @inheritdoc IWalletLink
    function linkNonEVMWalletToRootKey(NonEVMLinkedWallet calldata wallet, uint256 nonce) external {
        _linkNonEVMWalletToRootWalletViaCaller(wallet, nonce);
    }

    /// @inheritdoc IWalletLink
    function removeNonEVMWalletLink(WalletLib.Wallet calldata wallet, uint256 nonce) external {
        _removeNonEVMWalletLink(wallet, nonce);
    }

    /// @inheritdoc IWalletLink
    function removeLink(address wallet, LinkedWallet calldata rootWallet, uint256 nonce) external {
        _removeLink(wallet, rootWallet, nonce);
    }

    /// @inheritdoc IWalletLink
    function removeCallerLink() external {
        _removeCallerLink();
    }

    /// @inheritdoc IWalletLink
    function setDefaultWallet(address defaultWallet) external {
        _setDefaultWallet(msg.sender, defaultWallet);
    }

    /// @inheritdoc IWalletLink
    function setDependency(bytes32 dependency, address dependencyAddress) external onlyOwner {
        _setDependency(dependency, dependencyAddress);
    }

    /// @inheritdoc IWalletLink
    function getDefaultWallet(address rootWallet) external view returns (address) {
        return _getDefaultWallet(rootWallet);
    }

    /// @inheritdoc IWalletLink
    function getWalletsByRootKey(address rootKey) external view returns (address[] memory wallets) {
        return _getWalletsByRootKey(rootKey);
    }

    /// @inheritdoc IWalletLink
    function getAllWalletsByRootKey(
        address rootKey
    ) external view returns (WalletLib.Wallet[] memory wallets) {
        return _getAllWalletsByRootKey(rootKey);
    }

    /// @inheritdoc IWalletLink
    function getRootKeyForWallet(address wallet) external view returns (address rootKey) {
        return _getRootKeyByWallet(wallet);
    }

    /// @inheritdoc IWalletLink
    function checkIfLinked(address rootKey, address wallet) external view returns (bool) {
        return _checkIfLinked(rootKey, wallet);
    }

    /// @inheritdoc IWalletLink
    function checkIfNonEVMWalletLinked(
        address rootKey,
        bytes32 walletHash
    ) external view returns (bool) {
        return _checkIfNonEVMWalletLinked(rootKey, walletHash);
    }

    /// @inheritdoc IWalletLink
    function getLatestNonceForRootKey(address rootKey) external view returns (uint256) {
        return _latestNonce(rootKey);
    }

    /// @inheritdoc IWalletLink
    function getDependency(bytes32 dependency) external view returns (address) {
        return _getDependency(dependency);
    }
}
