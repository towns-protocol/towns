// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IMembership} from "src/spaces/facets/membership/IMembership.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

library DeployMembership {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(23);

        // Funds
        arr.p(IMembership.revenue.selector);

        // Minting
        arr.p(bytes4(keccak256("joinSpace(uint8,bytes)"))); // Unified joinSpace
        arr.p(bytes4(keccak256("joinSpace(address)"))); // Legacy joinSpace
        arr.p(IMembership.joinSpaceWithReferral.selector);
        arr.p(IMembership.renewMembership.selector);

        arr.p(IMembership.expiresAt.selector);

        // Duration
        arr.p(IMembership.getMembershipDuration.selector);
        arr.p(IMembership.setMembershipDuration.selector);

        // Pricing Module
        arr.p(IMembership.setMembershipPricingModule.selector);
        arr.p(IMembership.getMembershipPricingModule.selector);

        // Pricing
        arr.p(IMembership.setMembershipPrice.selector);
        arr.p(IMembership.getMembershipPrice.selector);
        arr.p(IMembership.getMembershipRenewalPrice.selector);
        arr.p(IMembership.getProtocolFee.selector);

        // Allocation
        arr.p(IMembership.setMembershipFreeAllocation.selector);
        arr.p(IMembership.getMembershipFreeAllocation.selector);

        // Limits
        arr.p(IMembership.setMembershipLimit.selector);
        arr.p(IMembership.getMembershipLimit.selector);

        // Currency
        arr.p(IMembership.getMembershipCurrency.selector);
        arr.p(IMembership.setMembershipCurrency.selector);

        // Image
        arr.p(IMembership.setMembershipImage.selector);
        arr.p(IMembership.getMembershipImage.selector);

        // Factory
        arr.p(IMembership.getSpaceFactory.selector);

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
        return LibDeploy.deployCode("MembershipFacet.sol", "");
    }
}
