// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {ScriptUtils} from "./ScriptUtils.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";

import {console} from "forge-std/console.sol";

contract EnableGating is ScriptUtils {
  SpaceFactory internal spaceFactory;

  function setUp() external {
    address spaceFactoryAddress = _readAddress(".spaceFactory");
    spaceFactory = SpaceFactory(spaceFactoryAddress);
  }

  function run() external {
    uint256 deployerPrivateKey = _getPrivateKey();
    vm.startBroadcast(deployerPrivateKey);
    spaceFactory.setPaused(true);
    spaceFactory.setGatingEnabled(true);
    spaceFactory.setPaused(false);
    vm.stopBroadcast();
  }
}
