// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";

// libraries

// contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";

import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";

contract ForkOmegaSpace is TestUtils, SpaceHelper, IArchitectBase {
  address founder;
  address space;

  address spaceFactory = 0x9978c826d93883701522d2CA645d5436e5654252;
  address spaceOwner = 0x2824D1235d1CbcA6d61C00C3ceeCB9155cd33a42;

  ICreateSpace spaceArchitect = ICreateSpace(spaceFactory);

  function setUp() external onlyForked {
    SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("fork-space");
    spaceInfo
      .membership
      .settings
      .pricingModule = 0x7E49Fcec32E060a3D710d568B249c0ED69f01005;

    founder = _randomAddress();

    vm.prank(founder);
    space = spaceArchitect.createSpace(spaceInfo);
  }
}
