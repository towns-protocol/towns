// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/* Libraries */
import "forge-std/Script.sol";

contract ScriptUtils is Script {
  function _getChainName() internal view returns (string memory) {
    uint256 id = block.chainid;
    if (id == 1) {
      return "mainnet";
    } else if (id == 3) {
      return "ropsten";
    } else if (id == 4) {
      return "rinkeby";
    } else if (id == 5) {
      return "goerli";
    } else if (id == 42) {
      return "kovan";
    } else if (id == 1337) {
      return "localhost";
    } else if (id == 31337) {
      return "localhost";
    } else {
      return "unknown";
    }
  }
}
