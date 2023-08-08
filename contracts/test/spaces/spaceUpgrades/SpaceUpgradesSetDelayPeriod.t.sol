// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {MockERC165} from "contracts/test/mocks/MockERC165.sol";
import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {SpaceUpgrades} from "contracts/src/spaces/SpaceUpgrades.sol";
import {ISpaceUpgrades} from "contracts/src/spaces/interfaces/ISpaceUpgrades.sol";

contract SpaceUpgradesSetDelayPeriod is SpaceBaseSetup {
  address internal _owner;

  function setUp() external {
    _owner = makeAddr("owner");
  }

  function test_revertInvalidDelayPeriod() external {
    vm.expectRevert(ISpaceUpgrades.InvalidDelayPeriod.selector);
    spaceUpgrades.setDelayPeriod(0);
  }

  function test_delayPeriod() external {
    uint256 newDelayPeriod = block.timestamp + 1 days;

    spaceUpgrades.setDelayPeriod(newDelayPeriod);

    assertEq(spaceUpgrades.delayPeriod(), newDelayPeriod);
  }
}
