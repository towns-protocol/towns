// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";

//libraries

//contracts
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";

contract ForkCreateSpace is IArchitectBase, TestUtils, SpaceHelper {
  address spaceFactory = 0x968696BC59431Ef085441641f550C8e2Eaca8BEd;

  function test_createForkSpace() external onlyForked {
    address founder = _randomAddress();

    SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("fork-space");
    spaceInfo
      .membership
      .settings
      .pricingModule = 0xd6557a643427d36DBae33B69d30f54A17De606Ab;

    Architect spaceArchitect = Architect(spaceFactory);

    vm.prank(founder);
    address space = spaceArchitect.createSpace(spaceInfo);

    address pricingModule = IMembership(space).getMembershipPricingModule();
    assertEq(pricingModule, spaceInfo.membership.settings.pricingModule);
  }
}
