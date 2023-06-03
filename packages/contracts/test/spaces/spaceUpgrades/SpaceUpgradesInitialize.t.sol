// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {SpaceUpgrades} from "contracts/src/spaces/SpaceUpgrades.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {TestUtils} from "contracts/test/utils/TestUtils.sol";

contract SpaceUpgradesInitialize is TestUtils {
  address public deployer;
  address public spaceFactory;
  uint256 public delayPeriod = block.timestamp + 1000;
  SpaceUpgrades public spaceUpgrades;

  function setUp() external {
    deployer = makeAddr("deployer");
    spaceFactory = makeAddr("spaceFactory");

    vm.startPrank(deployer);
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
    vm.stopPrank();

    spaceUpgrades = SpaceUpgrades(spaceUpgradesAddress);
  }

  function test_initialize() external {
    assertEq(spaceUpgrades.owner(), deployer);
    assertEq(spaceUpgrades.spaceFactoryAddress(), address(spaceFactory));
    assertEq(spaceUpgrades.delayPeriod(), delayPeriod);
  }
}
