// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Towns} from "contracts/src/core/tokens/Towns.sol";

contract DeployTowns is ScriptUtils {
  Towns public towns;

  function run() public {
    // vm.broadcast();
    towns = new Towns("Towns", "TOWNS");
  }
}
