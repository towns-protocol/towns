// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IEntitlementBase} from "contracts/src/towns/entitlements/IEntitlement.sol";

// libraries
import {EnumerableSet} from "openzeppelin-contracts/contracts/utils/structs/EnumerableSet.sol";
import {EntitlementsStorage} from "contracts/src/towns/facets/entitlements/EntitlementsStorage.sol";

// contracts
import {TokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/TokenOwnableBase.sol";
import {PausableBase} from "contracts/src/diamond/facets/pausable/PausableBase.sol";

abstract contract Entitled is IEntitlementBase, TokenOwnableBase, PausableBase {
  using EnumerableSet for EnumerableSet.AddressSet;

  string internal constant IN_TOWN = "";

  function _isEntitled(
    string memory channelId,
    address user,
    bytes32 permission
  ) internal view returns (bool entitled) {
    if (user == _owner()) return true;

    EntitlementsStorage.Layout storage ds = EntitlementsStorage.layout();

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
    string memory permission
  ) internal view returns (bool) {
    return
      _owner() == msg.sender ||
      (!_paused() &&
        _isEntitled(
          channelId,
          msg.sender,
          bytes32(abi.encodePacked(permission))
        ));
  }

  function _validatePermission(string memory permission) internal view {
    if (!_isAllowed(IN_TOWN, permission)) {
      revert Entitlement__NotAllowed();
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
