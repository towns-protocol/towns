// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";
import {Errors} from "contracts/src/spaces/libraries/Errors.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";

import {SpaceBaseSetup} from "contracts/test/spaces/SpaceBaseSetup.sol";
import {Space} from "contracts/src/spaces/Space.sol";
import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";

import {console} from "forge-std/console.sol";

contract GetSpaceInfoTest is SpaceBaseSetup {
  function test_getSpaceInfo() external {
    address space = createSimpleSpace();

    ISpace.SpaceInfo memory spaceInfo = Space(space).getSpaceInfo();

    assertEq(spaceInfo.spaceAddress, space);
    assertEq(spaceInfo.owner, address(this));
    assertEq(spaceInfo.disabled, false);
  }
}
