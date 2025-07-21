// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {PlatformRequirementsFacet} from "src/factory/facets/platform/requirements/PlatformRequirementsFacet.sol";

library DeployPlatformRequirements {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(17);
        arr.p(PlatformRequirementsFacet.getFeeRecipient.selector);
        arr.p(PlatformRequirementsFacet.getMembershipBps.selector);
        arr.p(PlatformRequirementsFacet.getMembershipFee.selector);
        arr.p(PlatformRequirementsFacet.getMembershipMintLimit.selector);
        arr.p(PlatformRequirementsFacet.getMembershipDuration.selector);
        arr.p(PlatformRequirementsFacet.setFeeRecipient.selector);
        arr.p(PlatformRequirementsFacet.setMembershipBps.selector);
        arr.p(PlatformRequirementsFacet.setMembershipFee.selector);
        arr.p(PlatformRequirementsFacet.setMembershipMintLimit.selector);
        arr.p(PlatformRequirementsFacet.setMembershipDuration.selector);
        arr.p(PlatformRequirementsFacet.setMembershipMinPrice.selector);
        arr.p(PlatformRequirementsFacet.getMembershipMinPrice.selector);
        arr.p(PlatformRequirementsFacet.getDenominator.selector);
        arr.p(PlatformRequirementsFacet.setSwapFees.selector);
        arr.p(PlatformRequirementsFacet.getSwapFees.selector);
        arr.p(PlatformRequirementsFacet.setRouterWhitelisted.selector);
        arr.p(PlatformRequirementsFacet.isRouterWhitelisted.selector);

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

    function makeInitData(
        address feeRecipient,
        uint16 membershipBps,
        uint256 membershipFee,
        uint256 membershipMintLimit,
        uint64 membershipDuration,
        uint256 membershipMinPrice
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(
                PlatformRequirementsFacet.__PlatformRequirements_init,
                (
                    feeRecipient,
                    membershipBps,
                    membershipFee,
                    membershipMintLimit,
                    membershipDuration,
                    membershipMinPrice
                )
            );
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("PlatformRequirementsFacet.sol", "");
    }
}
