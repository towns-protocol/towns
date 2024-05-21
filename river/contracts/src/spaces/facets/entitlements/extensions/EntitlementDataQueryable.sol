// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementDataQueryable} from "contracts/src/spaces/facets/entitlements/extensions/IEntitlementDataQueryable.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";

// libraries
import {ChannelService} from "contracts/src/spaces/facets/channels/ChannelService.sol";

// contracts
import {RolesBase} from "contracts/src/spaces/facets/roles/RolesBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract EntitlementDataQueryable is
  IRolesBase,
  IEntitlementDataQueryable,
  RolesBase,
  Facet
{
  function getEntitlementDataByPermission(
    string calldata permission
  ) external view returns (EntitlementData[] memory) {
    Role[] memory roles = _getRolesWithPermission(permission);
    return _getEntitlements(roles);
  }

  function getChannelEntitlementDataByPermission(
    bytes32 channelId,
    string calldata permission
  ) external view returns (EntitlementData[] memory) {
    Role[] memory roles = _getChannelRolesWithPermission(channelId, permission);
    return _getEntitlements(roles);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _getChannelRolesWithPermission(
    bytes32 channelId,
    string calldata permission
  ) internal view returns (Role[] memory) {
    uint256[] memory channelRoles = ChannelService.getRolesByChannel(channelId);

    uint256 roleCount = 0;
    uint256[] memory matchedRoleIds = new uint256[](channelRoles.length);

    bytes32 requestedPermission = keccak256(abi.encodePacked(permission));

    // Count the number of roles that have the requested permission and record their ids.
    for (uint256 i = 0; i < channelRoles.length; i++) {
      Role memory role = _getRoleById(channelRoles[i]);
      if (role.disabled) {
        continue;
      }
      // Check if the role has the requested permission.
      for (uint256 j = 0; j < role.permissions.length; j++) {
        if (keccak256(bytes(role.permissions[j])) == requestedPermission) {
          matchedRoleIds[roleCount] = role.id;
          roleCount++;
          break;
        }
      }
    }

    // Assemble the roles that have the requested permission for the specified channel.
    Role[] memory roles = new Role[](roleCount);
    for (uint256 i = 0; i < roleCount; i++) {
      roles[i] = _getRoleById(matchedRoleIds[i]);
    }

    return roles;
  }

  function _getEntitlements(
    Role[] memory roles
  ) internal view returns (EntitlementData[] memory) {
    uint256 entitlementCount = 0;
    for (uint256 i = 0; i < roles.length; i++) {
      Role memory role = roles[i];
      if (!role.disabled) {
        entitlementCount += role.entitlements.length;
      }
    }

    EntitlementData[] memory entitlementData = new EntitlementData[](
      entitlementCount
    );

    entitlementCount = 0;

    for (uint256 i = 0; i < roles.length; i++) {
      Role memory role = roles[i];
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
