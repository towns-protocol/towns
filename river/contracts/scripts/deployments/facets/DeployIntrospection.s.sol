// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployIntrospection is FacetHelper, Deployer {
  constructor() {
    addSelector(IntrospectionFacet.supportsInterface.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return IntrospectionFacet.__Introspection_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "introspectionFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    IntrospectionFacet facet = new IntrospectionFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
