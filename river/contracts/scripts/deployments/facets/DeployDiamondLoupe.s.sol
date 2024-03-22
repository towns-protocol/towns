// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";

contract DeployDiamondLoupe is Deployer {
  function versionName() public pure override returns (string memory) {
    return "diamondLoupeFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    DiamondLoupeFacet facet = new DiamondLoupeFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
