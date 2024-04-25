// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IMetadata} from "contracts/src/diamond/facets/metadata/IMetadata.sol";

//libraries

//contracts
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";

// import {Migration_2024_04_12} from "contracts/scripts/interactions/Migration_2024_04_12.s.sol";

contract ForkCreateSpace is IArchitectBase, TestUtils, SpaceHelper {
  // Migration_2024_04_12 internal migration = new Migration_2024_04_12();

  address spaceFactory = 0x968696BC59431Ef085441641f550C8e2Eaca8BEd;

  function setUp() public {
    // migration.run();
  }

  function test_createForkSpace() external onlyForked {
    address founder = _randomAddress();

    SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("fork-space");
    spaceInfo
      .membership
      .settings
      .pricingModule = 0xd6557a643427d36DBae33B69d30f54A17De606Ab;

    Architect spaceArchitect = Architect(spaceFactory);

    vm.prank(founder);
    spaceArchitect.createSpace(spaceInfo);
  }
}
