// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IRole} from "contracts/src/towns/facets/roles/IRole.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Roles} from "contracts/src/towns/facets/roles/Roles.sol";

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
    selectors_[0] = IRole.createRole.selector;
    selectors_[1] = IRole.getRoles.selector;
    selectors_[2] = IRole.getRoleById.selector;
    selectors_[3] = IRole.updateRole.selector;
    selectors_[4] = IRole.removeRole.selector;
    selectors_[5] = IRole.addPermissionsToRole.selector;
    selectors_[6] = IRole.removePermissionsFromRole.selector;
    selectors_[7] = IRole.getPermissionsByRoleId.selector;
    selectors_[8] = IRole.addRoleToEntitlement.selector;
    selectors_[9] = IRole.removeRoleFromEntitlement.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }
}
