// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IEntitlementBase} from "contracts/src/towns/entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementsManagerStorage} from "contracts/src/towns/facets/entitlements/EntitlementsManagerStorage.sol";
import {MembershipStorage} from "contracts/src/towns/facets/membership/MembershipStorage.sol";
import {ERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/ERC721ABase.sol";

// contracts
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";
import {BanningBase} from "contracts/src/towns/facets/banning/BanningBase.sol";

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

  function _isEntitled(
    string memory channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool entitled) {
    if (user == _owner()) return true;

    uint256 tokenId = MembershipStorage.layout().tokenIdByMember[user];
    if (_isBanned(tokenId) || _isBannedByChannel(channelId, tokenId))
      return false;

    EntitlementsManagerStorage.Layout storage ds = EntitlementsManagerStorage
      .layout();

    uint256 entitlementCount = ds.entitlements.length();

    for (uint256 i = 0; i < entitlementCount; i++) {
      if (
        IEntitlement(ds.entitlements.at(i)).isEntitled(
          channelId,
          user,
          permission
        )
      ) {
        entitled = true;
        break;
      }
    }
  }

  function _isEntitledToTown(
    address user,
    string calldata permission
  ) internal view returns (bool) {
    return _isEntitled(IN_TOWN, user, bytes32(abi.encodePacked(permission)));
  }

  function _isEntitledToChannel(
    string memory channelId,
    address user,
    string calldata permission
  ) internal view returns (bool) {
    return _isEntitled(channelId, user, bytes32(abi.encodePacked(permission)));
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
