// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {PlatformRequirementsFacet} from "contracts/src/factory/facets/platform/requirements/PlatformRequirementsFacet.sol";

contract PlatformRequirementsHelper is FacetHelper {
  PlatformRequirementsFacet internal platformReqs;

  constructor() {
    platformReqs = new PlatformRequirementsFacet();
  }

  function facet() public view override returns (address) {
    return address(platformReqs);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](11);
    uint256 index;

    selectors_[index++] = IPlatformRequirements.setFeeRecipient.selector;
    selectors_[index++] = IPlatformRequirements.getFeeRecipient.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipBps.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipBps.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipFee.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipFee.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipMintLimit.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipMintLimit.selector;
    selectors_[index++] = IPlatformRequirements.setMembershipDuration.selector;
    selectors_[index++] = IPlatformRequirements.getMembershipDuration.selector;
    selectors_[index++] = IPlatformRequirements.getDenominator.selector;

    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return PlatformRequirementsFacet.__PlatformRequirements_init.selector;
  }

  function makeInitData(
    address feeRecipient,
    uint16 membershipBps,
    uint256 membershipFee,
    uint256 membershipMintLimit,
    uint64 membershipDuration
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        PlatformRequirementsFacet.__PlatformRequirements_init.selector,
        feeRecipient,
        membershipBps,
        membershipFee,
        membershipMintLimit,
        membershipDuration
      );
  }
}
