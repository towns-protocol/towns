// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Deployer} from "./common/Deployer.s.sol";
import {DeploySpaceImpl} from "./DeploySpaceImpl.s.sol";
import {DeploySpaceFactory} from "./DeploySpaceFactory.s.sol";

import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";

contract UpgradeSpaceImpl is Deployer {
  function versionName() public pure override returns (string memory) {
    return "upgradeSpaceImpl";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    DeploySpaceImpl deploySpaceImpl = new DeploySpaceImpl();
    address spaceImpl = deploySpaceImpl.deploy();

    DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
    SpaceFactory spaceFactory = SpaceFactory(deploySpaceFactory.deploy());

    vm.startBroadcast(deployerPK);
    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(spaceImpl),
      address(0),
      address(0),
      address(0),
      address(0)
    );
    spaceFactory.setPaused(false);
    vm.stopBroadcast();

    return spaceImpl;
  }
}
