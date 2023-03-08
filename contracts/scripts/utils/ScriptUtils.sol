// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/* Libraries */
import "forge-std/Script.sol";

contract ScriptUtils is Script {
  function _isTesting() internal returns (bool) {
    return block.chainid == 31337 && vm.envOr("TESTING", false) == true;
  }

  function _readInput(
    string memory input
  ) internal view returns (string memory) {
    string memory inputDir = string.concat(vm.projectRoot(), "/script/input/");
    string memory chainDir = string.concat(vm.toString(block.chainid), "/");
    string memory file = string.concat(input, ".json");
    return vm.readFile(string.concat(inputDir, chainDir, file));
  }

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
