// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

import {console} from "forge-std/console.sol";
import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {TownOwner} from "contracts/src/core/tokens/TownOwner.sol";

contract DeployTownOwner is ScriptUtils {
  TownOwner public townOwner;

  function run() public {
    uint256 deployerPrivateKey = _getPrivateKey();
    address deployer = vm.addr(deployerPrivateKey);

    vm.broadcast();
    townOwner = new TownOwner("Town Owner", "TOWN", deployer, 0);

    console.log("Deployed Town Owner: ", address(townOwner));
  }
}
