// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementsManagerStorage} from "contracts/src/spaces/facets/entitlements/EntitlementsManagerStorage.sol";
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {WalletLinkProxyBase} from "contracts/src/spaces/facets/delegation/WalletLinkProxyBase.sol";

// contracts
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {BanningBase} from "contracts/src/spaces/facets/banning/BanningBase.sol";
import {ERC5643Base} from "contracts/src/diamond/facets/token/ERC5643/ERC5643Base.sol";

abstract contract Entitled is
  IEntitlementBase,
  TokenOwnableBase,
  PausableBase,
  BanningBase,
  ERC721ABase,
  WalletLinkProxyBase,
  ERC5643Base
{
  using EnumerableSet for EnumerableSet.AddressSet;

  bytes32 internal constant IN_TOWN = 0x0;

  function _isMember(address user) internal view returns (bool member) {
    member = _balanceOf(user) > 0;
  }

  function _isEntitled(
    bytes32 channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool) {
    address owner = _owner();

    address[] memory wallets = _getLinkedWalletsWithUser(user);
    uint256 linkedWalletsLength = wallets.length;

    uint256[] memory bannedTokens = _bannedTokenIds();
    uint256 bannedTokensLen = bannedTokens.length;

    for (uint256 i = 0; i < linkedWalletsLength; i++) {
      address wallet = wallets[i];

      if (wallet == owner) {
        return true;
      }

      // check if banned
      for (uint256 j; j < bannedTokensLen; j++) {
        if (_ownerOf(bannedTokens[j]) == wallet) {
          return false;
        }
      }
    }

    // Entitlement checks for members
    EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage
      .layout();
    uint256 entitlementsLength = ds.entitlements.length();

    for (uint256 i = 0; i < entitlementsLength; i++) {
      EntitlementsManagerStorage.Entitlement memory e = ds.entitlementByAddress[
        ds.entitlements.at(i)
      ];
      if (
        !e.entitlement.isCrosschain() &&
        e.entitlement.isEntitled(channelId, wallets, permission)
      ) {
        return true;
      }
    }

    return false;
  }

  function _isEntitledToSpace(
    address user,
    string calldata permission
  ) internal view returns (bool) {
    return _isEntitled(IN_TOWN, user, bytes32(abi.encodePacked(permission)));
  }

  function _isEntitledToChannel(
    bytes32 channelId,
    address user,
    string calldata permission
  ) internal view returns (bool) {
    return _isEntitled(channelId, user, bytes32(abi.encodePacked(permission)));
  }

  function _isAllowed(
    bytes32 channelId,
    string memory permission,
    address caller
  ) internal view returns (bool) {
    return
      _owner() == caller ||
      (!_paused() &&
        _isEntitled(channelId, caller, bytes32(abi.encodePacked(permission))));
  }

  function _isAllowed(
    bytes32 channelId,
    string memory permission
  ) internal view returns (bool) {
    address sender = msg.sender;

    return
      _owner() == sender ||
      (!_paused() &&
        _isEntitled(channelId, sender, bytes32(abi.encodePacked(permission))));
  }

  function _validatePermission(string memory permission) internal view {
    if (!_isAllowed(IN_TOWN, permission)) {
      revert Entitlement__NotAllowed();
    }
  }

  function _validatePermission(
    string memory permission,
    address caller
  ) internal view {
    if (!_isAllowed(IN_TOWN, permission, caller)) {
      revert Entitlement__NotAllowed();
    }
  }

  function _validateMembership(address user) internal view {
    if (!_isMember(user) && _owner() != user) {
      revert Entitlement__NotMember();
    }
  }

  function _validateChannelPermission(
    bytes32 channelId,
    string memory permission
  ) internal view {
    if (!_isAllowed(channelId, permission)) {
      revert Entitlement__NotAllowed();
    }
  }

  function _getLinkedWalletsWithUser(
    address rootKey
  ) internal view returns (address[] memory) {
    IWalletLink wl = IWalletLink(MembershipStorage.layout().spaceFactory);
    address[] memory linkedWallets = wl.getWalletsByRootKey(rootKey);

    // Allow for the possibility that the user is not a root key, but a linked wallet.
    address alternateRootKey = wl.getRootKeyForWallet(rootKey);
    if (linkedWallets.length == 0 && alternateRootKey != address(0)) {
      rootKey = alternateRootKey;
      linkedWallets = wl.getWalletsByRootKey(rootKey);
    }

    uint256 linkedWalletsLength = linkedWallets.length;

    address[] memory wallets = new address[](linkedWalletsLength + 1);
    for (uint256 i = 0; i < linkedWalletsLength; i++) {
      wallets[i] = linkedWallets[i];
    }
    wallets[linkedWalletsLength] = rootKey;
    return wallets;
  }
}
