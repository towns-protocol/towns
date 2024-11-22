// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {RiverPoints} from "contracts/src/tokens/points/RiverPoints.sol";

contract DeployRiverPoints is Deployer, FacetHelper {
  // FacetHelper
  constructor() {
    addSelector(RiverPoints.mint.selector);
    addSelector(RiverPoints.batchMintPoints.selector);
    addSelector(RiverPoints.getPoints.selector);
    addSelector(RiverPoints.balanceOf.selector);
    addSelector(RiverPoints.totalSupply.selector);
  }

  // Deploying
  function versionName() public pure override returns (string memory) {
    return "riverPointsFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return RiverPoints.__RiverPoints_init.selector;
  }

  function makeInitData(
    address spaceFactory
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), spaceFactory);
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    RiverPoints riverPointsFacet = new RiverPoints();
    vm.stopBroadcast();
    return address(riverPointsFacet);
  }
}
