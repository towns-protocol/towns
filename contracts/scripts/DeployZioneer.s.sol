// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {Zioneer} from "contracts/src/core/tokens/Zioneer.sol";
import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {console} from "forge-std/console.sol";

contract DeployZioneer is ScriptUtils {
  Zioneer zioneer;

  function run() public {
    vm.startBroadcast();
    zioneer = new Zioneer("Zioneer", "ZNR", "");
    vm.stopBroadcast();
    _logAddresses();
    _writeJson();
  }

  function _logAddresses() internal view {
    console.log("--- Deployed Zioneer ---");
    console.log("Zioneer NFT: ", address(zioneer));
    console.log("------------------------");
  }

  function _writeJson() internal {
    string memory json = "";
    json = vm.serializeString(json, "zioneer", vm.toString(address(zioneer)));
    string memory path = string.concat(
      "packages/contracts/",
      _getChainName(),
      "/addresses/zioneer.json"
    );
    vm.writeJson(json, path);
  }
}
