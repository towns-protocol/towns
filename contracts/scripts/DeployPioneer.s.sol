// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Pioneer} from "contracts/src/core/tokens/Pioneer.sol";

contract DeployPioneer is ScriptUtils {
  Pioneer public pioneer;

  function run() public {
    vm.broadcast();
    pioneer = new Pioneer("Pioneer", "PIONEER", "");
  }
}
