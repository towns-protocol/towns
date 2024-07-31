// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {GuardianFacet} from "contracts/src/spaces/facets/guardian/GuardianFacet.sol";

contract DeployGuardianFacet is FacetHelper, Deployer {
  constructor() {
    addSelector(GuardianFacet.enableGuardian.selector);
    addSelector(GuardianFacet.guardianCooldown.selector);
    addSelector(GuardianFacet.disableGuardian.selector);
    addSelector(GuardianFacet.isGuardianEnabled.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "guardianFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return GuardianFacet.__GuardianFacet_init.selector;
  }

  function makeInitData(uint256 cooldown) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), cooldown);
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    GuardianFacet facet = new GuardianFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
