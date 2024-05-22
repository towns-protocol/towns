// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {PlatformRequirementsFacet} from "contracts/src/factory/facets/platform/requirements/PlatformRequirementsFacet.sol";

contract DeployPlatformRequirements is FacetHelper, Deployer {
  constructor() {
    addSelector(PlatformRequirementsFacet.getFeeRecipient.selector);
    addSelector(PlatformRequirementsFacet.getMembershipBps.selector);
    addSelector(PlatformRequirementsFacet.getMembershipFee.selector);
    addSelector(PlatformRequirementsFacet.getMembershipMintLimit.selector);
    addSelector(PlatformRequirementsFacet.getMembershipDuration.selector);
    addSelector(PlatformRequirementsFacet.setFeeRecipient.selector);
    addSelector(PlatformRequirementsFacet.setMembershipBps.selector);
    addSelector(PlatformRequirementsFacet.setMembershipFee.selector);
    addSelector(PlatformRequirementsFacet.setMembershipMintLimit.selector);
    addSelector(PlatformRequirementsFacet.setMembershipDuration.selector);
    addSelector(PlatformRequirementsFacet.getDenominator.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "platformRequirements";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    PlatformRequirementsFacet facet = new PlatformRequirementsFacet();
    vm.stopBroadcast();
    return address(facet);
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
