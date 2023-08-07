// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Deployer} from "./common/Deployer.s.sol";
import {DeploySpaceImpl} from "./DeploySpaceImpl.s.sol";
import {DeploySpaceFactory} from "./DeploySpaceFactory.s.sol";

import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";

contract UpgradeSpaceFactoryImpl is Deployer {
  function versionName() public pure override returns (string memory) {
    return "spaceFactoryImpl";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
    SpaceFactory spaceFactory = SpaceFactory(deploySpaceFactory.deploy());

    vm.startBroadcast(deployerPK);
    SpaceFactory newSpaceFactory = new SpaceFactory();

    spaceFactory.setPaused(true);
    spaceFactory.upgradeTo(address(newSpaceFactory));
    spaceFactory.setPaused(false);
    vm.stopBroadcast();

    return address(newSpaceFactory);
  }
}
