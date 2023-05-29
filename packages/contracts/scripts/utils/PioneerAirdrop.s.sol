// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {ScriptUtils} from "./ScriptUtils.sol";
import {Pioneer} from "contracts/src/tokens/Pioneer.sol";

contract PioneerAirdrop is ScriptUtils {
  Pioneer internal pioneer;
  address[] internal addresses;

  function setUp() external {
    address pioneerAddress = _readAddress("pioneerToken");
    pioneer = Pioneer(payable(pioneerAddress));
    addresses = new address[](0);
  }

  function run() external {
    vm.startBroadcast();

    for (uint256 i = 0; i < addresses.length; i++) {
      if (addresses[i] != address(0)) {
        pioneer.mintTo(addresses[i]);
      }
    }
    vm.stopBroadcast();
  }
}
