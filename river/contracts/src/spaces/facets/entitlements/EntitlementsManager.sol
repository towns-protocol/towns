// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementsManager} from "./IEntitlementsManager.sol";
import {IEntitlement} from "./../../entitlements/IEntitlement.sol";
import {IRolesBase} from "../../facets/roles/IRoles.sol";
import {IRuleEntitlement} from "./../../entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "./../../entitlements/user/IUserEntitlement.sol";

// libraries

// contracts
import {EntitlementsManagerBase} from "./EntitlementsManagerBase.sol";
import {Entitled} from "../Entitled.sol";
import {RolesBase} from "../../facets/roles/RolesBase.sol";

contract EntitlementsManager is
  IEntitlementsManager,
  EntitlementsManagerBase,
  RolesBase,
  Entitled
{
  function addImmutableEntitlements(
    address[] memory entitlements
  ) external onlyOwner {
    _addImmutableEntitlements(entitlements);
  }

  function addEntitlementModule(address entitlement) external onlyOwner {
    _addEntitlementModule(entitlement);
  }

  function removeEntitlementModule(address entitlement) external onlyOwner {
    _removeEntitlementModule(entitlement);
  }

  function getEntitlements() external view returns (Entitlement[] memory) {
    return _getEntitlements();
  }

  function getEntitlement(
    address entitlement
  ) external view returns (Entitlement memory) {
    return _getEntitlement(entitlement);
  }

  function isEntitledToSpace(
    address user,
    string calldata permission
  ) external view returns (bool) {
    return _isEntitledToSpace(user, permission);
  }

  function isEntitledToChannel(
    bytes32 channelId,
    address user,
    string calldata permission
  ) external view returns (bool) {
    return _isEntitledToChannel(channelId, user, permission);
  }

  function getEntitlementDataByPermission(
    string calldata permission
  ) external view returns (EntitlementData[] memory) {
    IRolesBase.Role[] memory roles = _getRolesWithPermission(permission);
    uint256 entitlementCount = 0;
    for (uint256 i = 0; i < roles.length; i++) {
      IRolesBase.Role memory role = roles[i];
      if (!role.disabled) {
        entitlementCount += role.entitlements.length;
      }
    }

    EntitlementData[] memory entitlementData = new EntitlementData[](
      entitlementCount
    );

    entitlementCount = 0;

    for (uint256 i = 0; i < roles.length; i++) {
      IRolesBase.Role memory role = roles[i];
      if (!role.disabled) {
        for (uint256 j = 0; j < role.entitlements.length; j++) {
          IEntitlement entitlement = IEntitlement(role.entitlements[j]);
          if (!entitlement.isCrosschain()) {
            IUserEntitlement ue = IUserEntitlement(address(entitlement));
            entitlementData[entitlementCount] = EntitlementData(
              ue.moduleType(),
              ue.getEntitlementDataByRoleId(role.id)
            );
          } else {
            IRuleEntitlement re = IRuleEntitlement(address(entitlement));
            entitlementData[entitlementCount] = EntitlementData(
              re.moduleType(),
              re.getEntitlementDataByRoleId(role.id)
            );
          }
          entitlementCount++;
        }
      }
    }
    return entitlementData;
  }
}
