// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Deployer} from "./common/Deployer.s.sol";
import {SpaceUpgrades} from "contracts/src/spaces/SpaceUpgrades.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {DeploySpaceFactory} from "./DeploySpaceFactory.s.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";

contract DeploySpaceUpgrades is Deployer {
  SpaceUpgrades public spaceUpgrades;
  uint256 public delayPeriod = block.timestamp + 1 days;

  function versionName() public pure override returns (string memory) {
    return "spaceUpgrades";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
    SpaceFactory spaceFactory = SpaceFactory(deploySpaceFactory.deploy());

    vm.startBroadcast(deployerPK);
    spaceUpgrades = new SpaceUpgrades();
    address spaceUpgradesAddress = address(
      new ERC1967Proxy(
        address(spaceUpgrades),
        abi.encodeCall(
          spaceUpgrades.initialize,
          (address(spaceFactory), delayPeriod)
        )
      )
    );

    spaceFactory.setPaused(true);
    spaceFactory.updateImplementations(
      address(0),
      address(0),
      address(0),
      address(0),
      address(spaceUpgrades)
    );
    spaceFactory.setPaused(false);
    vm.stopBroadcast();

    return spaceUpgradesAddress;
  }
}
