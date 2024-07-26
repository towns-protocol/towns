// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementDataQueryable} from "contracts/src/spaces/facets/entitlements/extensions/IEntitlementDataQueryable.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IEntitlementGatedBase} from "contracts/src/spaces/facets/gated/IEntitlementGated.sol";

// libraries
import {ChannelService} from "contracts/src/spaces/facets/channels/ChannelService.sol";
import {EntitlementGatedStorage} from "contracts/src/spaces/facets/gated/EntitlementGatedStorage.sol";
import {RolesStorage} from "contracts/src/spaces/facets/roles/RolesStorage.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";

// contracts
import {RolesBase} from "contracts/src/spaces/facets/roles/RolesBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract EntitlementDataQueryable is
  IRolesBase,
  IEntitlementDataQueryable,
  IEntitlementGatedBase,
  RolesBase,
  Facet
{
  using StringSet for StringSet.Set;

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

  function getCrossChainEntitlementData(
    bytes32 transactionId,
    uint256 roleId
  ) external view returns (EntitlementData memory) {
    EntitlementGatedStorage.Layout storage ds = EntitlementGatedStorage
      .layout();

    Transaction storage transaction = ds.transactions[transactionId];

    if (transaction.hasBenSet == false) {
      revert EntitlementGated_TransactionNotRegistered();
    }

    IEntitlement re = IEntitlement(transaction.entitlement);

    return
      EntitlementData(re.moduleType(), re.getEntitlementDataByRoleId(roleId));
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _getChannelRolesWithPermission(
    bytes32 channelId,
    string calldata permission
  ) internal view returns (Role[] memory) {
    uint256[] memory channelRoles = ChannelService.getRolesByChannel(channelId);
    uint256 channelRolesLength = channelRoles.length;

    uint256 roleCount = 0;
    uint256[] memory matchedRoleIds = new uint256[](channelRolesLength);

    RolesStorage.Layout storage ds = RolesStorage.layout();

    // Count the number of roles that have the requested permission and record their ids.
    for (uint256 i; i < channelRolesLength; i++) {
      uint256 roleId = channelRoles[i];

      RolesStorage.Role storage role = ds.roleById[roleId];

      if (role.isImmutable) {
        continue;
      }

      // Check if the role has the requested permission.
      if (role.permissions.contains(permission)) {
        matchedRoleIds[roleCount] = roleId;
        roleCount++;
      }
    }

    // Assemble the roles that have the requested permission for the specified channel.
    Role[] memory roles = new Role[](roleCount);
    for (uint256 i; i < roleCount; i++) {
      roles[i] = _getRoleById(matchedRoleIds[i]);
    }

    return roles;
  }

  function _getEntitlements(
    Role[] memory roles
  ) internal view returns (EntitlementData[] memory) {
    uint256 entitlementCount;
    uint256 rolesLength = roles.length;

    for (uint256 i = 0; i < rolesLength; i++) {
      Role memory role = roles[i];

      if (!role.disabled) {
        entitlementCount += role.entitlements.length;
      }
    }

    EntitlementData[] memory entitlementData = new EntitlementData[](
      entitlementCount
    );

    entitlementCount = 0;

    for (uint256 i; i < rolesLength; i++) {
      Role memory role = roles[i];

      if (!role.disabled) {
        for (uint256 j; j < role.entitlements.length; j++) {
          IEntitlement entitlement = IEntitlement(role.entitlements[j]);

          entitlementData[entitlementCount] = EntitlementData(
            entitlement.moduleType(),
            entitlement.getEntitlementDataByRoleId(role.id)
          );

          entitlementCount++;
        }
      }
    }
    return entitlementData;
  }
}
