// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {MembershipJoin} from "contracts/src/spaces/facets/membership/join/MembershipJoin.sol";

contract MockLegacyMembership is MembershipJoin {
  function joinSpaceLegacy(address receiver) external payable {
    ReferralTypes memory emptyReferral;
    _joinSpaceWithReferral(receiver, emptyReferral);
  }

  function _checkEntitlement(
    address receiver,
    address,
    bytes32 transactionId
  )
    internal
    virtual
    override
    returns (bool isEntitled, bool isCrosschainPending)
  {
    IRolesBase.Role[] memory roles = _getRolesWithPermission(
      Permissions.JoinSpace
    );
    address[] memory linkedWallets = _getLinkedWalletsWithUser(receiver);

    uint256 totalRoles = roles.length;

    for (uint256 i = 0; i < totalRoles; i++) {
      Role memory role = roles[i];
      if (role.disabled) continue;

      for (uint256 j = 0; j < role.entitlements.length; j++) {
        IEntitlement entitlement = IEntitlement(role.entitlements[j]);

        if (entitlement.isEntitled(IN_TOWN, linkedWallets, JOIN_SPACE)) {
          isEntitled = true;
          return (isEntitled, false);
        }

        if (entitlement.isCrosschain()) {
          _requestEntitlementCheck(
            receiver,
            transactionId,
            IRuleEntitlement(address(entitlement)),
            role.id
          );
          isCrosschainPending = true;
        }
      }
    }

    return (isEntitled, isCrosschainPending);
  }
}
