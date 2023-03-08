// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {SpaceOwner} from "contracts/src/core/tokens/SpaceOwner.sol";

contract DeploySpaceOwner is ScriptUtils {
  SpaceOwner public spaceToken;

  function run() public {
    vm.broadcast();
    spaceToken = new SpaceOwner("Space Owner", "SPACE");
  }
}
