// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

contract DeployIntrospection is Deployer {
  function versionName() public pure override returns (string memory) {
    return "introspectionFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    IntrospectionFacet facet = new IntrospectionFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
