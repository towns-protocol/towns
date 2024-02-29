// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/crosschain/IRuleEntitlement.sol";

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementsManagerStorage} from "contracts/src/spaces/facets/entitlements/EntitlementsManagerStorage.sol";
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";
import {RuleEntitlementUtil} from "contracts/src/crosschain/RuleEntitlementUtil.sol";
import {WalletLinkStorage} from "contracts/src/river/wallet-link/WalletLinkStorage.sol";

// contracts
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {BanningBase} from "contracts/src/spaces/facets/banning/BanningBase.sol";

import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

abstract contract Entitled is
  IEntitlementBase,
  TokenOwnableBase,
  PausableBase,
  BanningBase,
  ERC721ABase
{
  using EnumerableSet for EnumerableSet.AddressSet;

  string internal constant IN_TOWN = "";

  function _isMember(address user) internal view returns (bool member) {
    member = _balanceOf(user) > 0;
  }

  // Joining is a special case of entitlement as it requires the user to not be a member
  function _isEntitledToJoinTown(
    string memory channelId,
    address user
  ) internal view returns (bool) {
    address owner = _owner();

    // Initialize WalletLink and Membership storage
    WalletLinkStorage.Layout storage wl = WalletLinkStorage.layout();
    address[] memory linkedWallets = wl.rootKeysToWallets[user].values();
    address[] memory wallets = new address[](linkedWallets.length + 1);
    wallets[0] = user;
    for (uint256 i = 0; i < linkedWallets.length; i++) {
      wallets[i + 1] = linkedWallets[i];
    }

    bool isMember = false;
    for (uint256 i = 0; i < wallets.length && !isMember; i++) {
      address wallet = wallets[i];
      if (_isMember(wallet)) {
        isMember = true;
      }
    }

    // Can't join if already a member
    if (isMember) {
      return false;
    }

    // If a linked wallet is owner, return true
    for (uint256 i = 0; i < wallets.length; i++) {
      if (wallets[i] == owner) {
        return true;
      }
    }

    // Entitlement checks for members
    EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage
      .layout();
    for (uint256 i = 0; i < ds.entitlements.length(); i++) {
      EntitlementsManagerStorage.Entitlement memory e = ds.entitlementByAddress[
        ds.entitlements.at(i)
      ];
      if (
        !e.isCrosschain &&
        e.entitlement.isEntitled(
          channelId,
          wallets,
          bytes32(abi.encodePacked(Permissions.JoinSpace))
        )
      ) {
        return true;
      }
    }

    return false;
  }

  function _isEntitled(
    string memory channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool) {
    // If permission is JoinTown, return true without further entitlement checks
    if (permission == bytes32(abi.encodePacked(Permissions.JoinSpace))) {
      return _isEntitledToJoinTown(channelId, user);
    } else {
      address owner = _owner();

      // Initialize WalletLink and Membership storage
      WalletLinkStorage.Layout storage wl = WalletLinkStorage.layout();
      address[] memory linkedWallets = wl.rootKeysToWallets[user].values();
      address[] memory wallets = new address[](linkedWallets.length + 1);
      wallets[0] = user;
      for (uint256 i = 0; i < linkedWallets.length; i++) {
        wallets[i + 1] = linkedWallets[i];
      }

      // If a linked wallet is owner, return true
      for (uint256 i = 0; i < wallets.length; i++) {
        if (wallets[i] == owner) {
          return true;
        }
      }

      bool isMember = false;
      uint256 tokenId;
      for (uint256 i = 0; i < wallets.length && !isMember; i++) {
        address wallet = wallets[i];
        if (_isMember(wallet)) {
          isMember = true;
          MembershipStorage.Layout storage ms = MembershipStorage.layout();
          tokenId = ms.tokenIdByMember[wallet];
        }
      }

      if (!isMember) {
        return false;
      }

      if (tokenId == 0) {
        // tokenId 0 should be assigned the owner, and the owner should have early exited.
        // however it is legal for the owner to have transfered their NFT to another
        // and that adddress is now a member. Putting this comment here as a reminder
      }

      // Check for ban conditions
      if (_isBanned(tokenId) || _isBannedByChannel(channelId, tokenId)) {
        return false;
      }

      // Entitlement checks for members
      EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage
        .layout();
      for (uint256 i = 0; i < ds.entitlements.length(); i++) {
        EntitlementsManagerStorage.Entitlement memory e = ds
          .entitlementByAddress[ds.entitlements.at(i)];
        if (
          !e.isCrosschain &&
          e.entitlement.isEntitled(channelId, wallets, permission)
        ) {
          return true;
        }
      }

      return false;
    }
  }

  function _isEntitledToSpace(
    address user,
    string calldata permission
  ) internal view returns (bool) {
    return _isEntitled(IN_TOWN, user, bytes32(abi.encodePacked(permission)));
  }

  function _getTownEntitlements(
    string calldata permission
  ) internal pure returns (IRuleEntitlement.RuleData memory data) {
    // TODO return correct rules to be validated by apps
    data = RuleEntitlementUtil.getNoopRuleData();
  }

  function _isEntitledToChannel(
    string memory channelId,
    address user,
    string calldata permission
  ) internal view returns (bool) {
    return _isEntitled(channelId, user, bytes32(abi.encodePacked(permission)));
  }

  function _getChannelEntitlements(
    string memory channelId,
    string calldata permission
  ) internal view returns (IRuleEntitlement.RuleData memory data) {
    // TODO return correct rules to be validated by apps
    data = RuleEntitlementUtil.getNoopRuleData();
  }

  function _isAllowed(
    string memory channelId,
    string memory permission,
    address caller
  ) internal view returns (bool) {
    return
      _owner() == caller ||
      (!_paused() &&
        _isEntitled(channelId, caller, bytes32(abi.encodePacked(permission))));
  }

  function _isAllowed(
    string memory channelId,
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
    string memory channelId,
    string memory permission
  ) internal view {
    if (!_isAllowed(channelId, permission)) {
      revert Entitlement__NotAllowed();
    }
  }
}
