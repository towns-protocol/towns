// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Roles} from "contracts/src/spaces/facets/roles/Roles.sol";

contract DeployRoles is FacetHelper, Deployer {
  constructor() {
    addSelector(Roles.createRole.selector);
    addSelector(Roles.getRoles.selector);
    addSelector(Roles.getRoleById.selector);
    addSelector(Roles.updateRole.selector);
    addSelector(Roles.removeRole.selector);
    addSelector(Roles.addPermissionsToRole.selector);
    addSelector(Roles.removePermissionsFromRole.selector);
    addSelector(Roles.getPermissionsByRoleId.selector);
    addSelector(Roles.addRoleToEntitlement.selector);
    addSelector(Roles.removeRoleFromEntitlement.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "roles";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    Roles facet = new Roles();
    vm.stopBroadcast();
    return address(facet);
  }
}
