// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {ScriptUtils} from "./ScriptUtils.sol";
import {SimpleFaucet} from "contracts/src/utils/SimpleFaucet.sol";

import {console} from "forge-std/console.sol";

contract DeployFaucet is ScriptUtils {
  function run() external {
    vm.broadcast();
    SimpleFaucet faucet = new SimpleFaucet();
    console.log("Deployed SimpleFaucet at", address(faucet));
  }
}
