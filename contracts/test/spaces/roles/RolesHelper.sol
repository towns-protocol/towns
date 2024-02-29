// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";

contract RolesHelper is FacetHelper {
  Roles internal roles;

  constructor() {
    roles = new Roles();
  }

  function deploy() public returns (address) {
    roles = new Roles();
    return address(roles);
  }

  function facet() public view override returns (address) {
    return address(roles);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](10);
    selectors_[0] = IRoles.createRole.selector;
    selectors_[1] = IRoles.getRoles.selector;
    selectors_[2] = IRoles.getRoleById.selector;
    selectors_[3] = IRoles.updateRole.selector;
    selectors_[4] = IRoles.removeRole.selector;
    selectors_[5] = IRoles.addPermissionsToRole.selector;
    selectors_[6] = IRoles.removePermissionsFromRole.selector;
    selectors_[7] = IRoles.getPermissionsByRoleId.selector;
    selectors_[8] = IRoles.addRoleToEntitlement.selector;
    selectors_[9] = IRoles.removeRoleFromEntitlement.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
