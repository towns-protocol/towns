// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import "forge-std/Script.sol";
import {Zioneer} from "../src/dao/Zioneer.sol";

contract DeployZioneer is Script {
  Zioneer zioneer;

  function run() public {
    vm.startBroadcast();
    zioneer = new Zioneer("Zioneer", "ZNR", "");
    vm.stopBroadcast();
  }
}
