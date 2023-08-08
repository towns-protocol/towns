// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/* Libraries */

// solhint-disable-next-line no-global-import
import "forge-std/Script.sol";

contract ScriptUtils is Script {
  function _isTesting() internal returns (bool) {
    return block.chainid == 31337 && vm.envOr("TESTING", false) == true;
  }

  function _getPrivateKey() internal view returns (uint256) {
    if (block.chainid == 31337) return vm.envUint("LOCAL_PRIVATE_KEY");
    if (block.chainid == 1337) return vm.envUint("LOCAL_PRIVATE_KEY");
    if (block.chainid == 5) return vm.envUint("GOERLI_PRIVATE_KEY");
    if (block.chainid == 11155111) return vm.envUint("SEPOLIA_PRIVATE_KEY");
    else revert("No private key found");
  }

  function _readInput(
    string memory input
  ) internal view returns (string memory) {
    string memory inputDir = string.concat(vm.projectRoot(), "/script/input/");
    string memory chainDir = string.concat(vm.toString(block.chainid), "/");
    string memory file = string.concat(input, ".json");
    return vm.readFile(string.concat(inputDir, chainDir, file));
  }

  function _writeAddress(string memory key, address value) internal {
    string memory generatedPath = "packages/generated/addresses.json";
    string memory goPath = "servers/dendrite/zion/contracts/addresses.json";
    string
      memory casablancaPath = "casablanca/node/auth/contracts/addresses.json";

    string memory finalValue = string.concat(
      ".",
      vm.toString(block.chainid),
      ".",
      key
    );

    vm.writeJson(vm.toString(value), generatedPath, finalValue);
    vm.writeJson(vm.toString(value), goPath, finalValue);
    vm.writeJson(vm.toString(value), casablancaPath, finalValue);
  }

  function _getChainName() internal view returns (string memory) {
    uint256 id = block.chainid;
    if (id == 1) {
      return "mainnet";
    } else if (id == 11155111) {
      return "sepolia";
    } else if (id == 5) {
      return "goerli";
    } else if (id == 1337) {
      return "localhost";
    } else if (id == 31337) {
      return "localhost";
    } else {
      return "unknown";
    }
  }

  function _readAddress(string memory input) internal returns (address) {
    string memory inputDir = string.concat(
      vm.projectRoot(),
      "/packages/generated/addresses.json"
    );

    string memory file = vm.readFile(inputDir);
    string memory finalValue = string.concat(
      ".",
      vm.toString(block.chainid),
      ".",
      input
    );

    return vm.parseJsonAddress(file, finalValue);
  }
}
