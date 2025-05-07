// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IRoles} from "src/spaces/facets/roles/IRoles.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployRoles {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(13);
        arr.p(IRoles.createRole.selector);
        arr.p(IRoles.getRoles.selector);
        arr.p(IRoles.getRoleById.selector);
        arr.p(IRoles.updateRole.selector);
        arr.p(IRoles.removeRole.selector);
        arr.p(IRoles.addPermissionsToRole.selector);
        arr.p(IRoles.removePermissionsFromRole.selector);
        arr.p(IRoles.getPermissionsByRoleId.selector);
        arr.p(IRoles.addRoleToEntitlement.selector);
        arr.p(IRoles.removeRoleFromEntitlement.selector);
        // channel permission overrides
        arr.p(IRoles.setChannelPermissionOverrides.selector);
        arr.p(IRoles.getChannelPermissionOverrides.selector);
        arr.p(IRoles.clearChannelPermissionOverrides.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeCut(
        address facetAddress,
        IDiamond.FacetCutAction action
    ) internal pure returns (IDiamond.FacetCut memory) {
        return IDiamond.FacetCut(facetAddress, action, selectors());
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("Roles.sol", "");
    }
}
