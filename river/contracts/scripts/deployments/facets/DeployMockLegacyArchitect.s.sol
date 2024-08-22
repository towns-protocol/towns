// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MockLegacyArchitect} from "contracts/test/mocks/legacy/MockLegacyArchitect.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployMockLegacyArchitect is FacetHelper, Deployer {
  constructor() {
    addSelector(MockLegacyArchitect.createSpace.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return MockLegacyArchitect.__Architect_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "mockLegacyArchitectFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MockLegacyArchitect architect = new MockLegacyArchitect();
    vm.stopBroadcast();
    return address(architect);
  }
}
