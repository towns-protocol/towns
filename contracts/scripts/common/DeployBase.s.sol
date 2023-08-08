// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import "forge-std/Script.sol";
import "forge-std/StdChains.sol";

contract DeployBase is Script {
  bool internal DEBUG = true;

  // =============================================================
  //                      LOGGING HELPERS
  // =============================================================

  function debug(string memory message) internal view {
    if (DEBUG) {
      console2.log(string.concat("[DEBUG]: ", message));
    }
  }

  function debug(string memory message, string memory arg) internal view {
    if (DEBUG) {
      console2.log(string.concat("[DEBUG]: ", message), arg);
    }
  }

  function debug(string memory message, address arg) internal view {
    if (DEBUG) {
      console2.log(string.concat("[DEBUG]: ", message), arg);
    }
  }

  function info(string memory message, string memory arg) internal view {
    console2.log(string.concat("[INFO]: ", message), arg);
  }

  function info(string memory message, address arg) internal view {
    console2.log(string.concat("[INFO]: ", unicode"✅ ", message), arg);
  }

  function warn(string memory message, address arg) internal view {
    console2.log(string.concat("[WARN]: ", unicode"⚠️ ", message), arg);
  }

  // =============================================================
  //                       FFI HELPERS
  // =============================================================

  function ffi(string memory cmd) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](1);
    commandInput[0] = cmd;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](2);
    commandInput[0] = cmd;
    commandInput[1] = arg;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg1,
    string memory arg2
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](3);
    commandInput[0] = cmd;
    commandInput[1] = arg1;
    commandInput[2] = arg2;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg1,
    string memory arg2,
    string memory arg3
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](4);
    commandInput[0] = cmd;
    commandInput[1] = arg1;
    commandInput[2] = arg2;
    commandInput[3] = arg3;
    return vm.ffi(commandInput);
  }

  function ffi(
    string memory cmd,
    string memory arg1,
    string memory arg2,
    string memory arg3,
    string memory arg4
  ) internal returns (bytes memory results) {
    string[] memory commandInput = new string[](5);
    commandInput[0] = cmd;
    commandInput[1] = arg1;
    commandInput[2] = arg2;
    commandInput[3] = arg3;
    commandInput[4] = arg4;
    return vm.ffi(commandInput);
  }

  // =============================================================
  //                       STRING HELPERS
  // =============================================================
  function endsWith(
    bytes memory str,
    bytes memory suffix
  ) internal pure returns (bool) {
    if (str.length < suffix.length) return false;

    unchecked {
      for (uint256 i = 0; i < suffix.length; i++) {
        if (str[str.length - suffix.length + i] != suffix[i]) return false;
      }
    }

    return true;
  }

  // =============================================================
  //                     FILE SYSTEM HELPERS
  // =============================================================
  function exists(string memory path) internal returns (bool) {
    bytes memory result = ffi("ls", path);

    // ideally we would just check the return code, but the ffi function doesn't return it yet
    // ffi only returns stdout, the "No such file or directory" message is sent to stderr
    return result.length > 0;
  }

  function createDir(string memory path) internal {
    if (!exists(path)) {
      debug("creating directory: ", path);
      ffi("mkdir", "-p", path);
    }
  }

  // =============================================================
  //                      DEPLOYMENT HELPERS
  // =============================================================
  function chainAlias() internal returns (string memory) {
    return getChain(block.chainid).chainAlias;
  }

  function networkDirPath() internal returns (string memory path) {
    path = string.concat(
      vm.projectRoot(),
      "/contracts/deployments/",
      chainAlias()
    );
  }

  function createChainIdFile(string memory _networkDirPath) internal {
    string memory chainIdFilePath = string.concat(_networkDirPath, "/.chainId");
    if (!exists(chainIdFilePath)) {
      debug("creating chain id file: ", chainIdFilePath);
      vm.writeFile(chainIdFilePath, vm.toString(block.chainid));
    }
  }

  function deploymentPath(
    string memory versionName
  ) internal returns (string memory path) {
    path = string.concat(networkDirPath(), "/", versionName, ".json");
  }

  function clientPaths() internal view returns (string[] memory) {
    string memory genPath = string.concat(
      vm.projectRoot(),
      "/packages/generated/addresses.json"
    );
    string memory dendritePath = string.concat(
      vm.projectRoot(),
      "/servers/dendrite/zion/contracts/addresses.json"
    );
    string memory casablancaPath = string.concat(
      vm.projectRoot(),
      "/casablanca/node/auth/contracts/addresses.json"
    );

    string[] memory paths = new string[](3);
    paths[0] = genPath;
    paths[1] = dendritePath;
    paths[2] = casablancaPath;
    return paths;
  }

  function getDeployment(string memory versionName) internal returns (address) {
    if (isAnvil()) {
      debug("not fetching deployments when targeting anvil");
      return address(0);
    }

    string memory path = deploymentPath(versionName);

    if (!exists(path)) {
      debug(
        string.concat(
          "no deployment found for ",
          versionName,
          " on ",
          chainAlias()
        )
      );
      return address(0);
    }

    string memory data = vm.readFile(path);
    return vm.parseJsonAddress(data, ".address");
  }

  function saveDeployment(
    string memory versionName,
    address contractAddr
  ) internal {
    if (isAnvil()) {
      debug("not saving deployments to file when targeting anvil");
      return;
    }

    if (vm.envOr("SAVE_DEPLOYMENTS", uint256(0)) == 0) {
      debug("(set SAVE_DEPLOYMENTS=1 to save deployments to file)");
      return;
    }

    // make sure the newtork directory exists
    string memory _networkDirPath = networkDirPath();
    createDir(_networkDirPath);
    createChainIdFile(_networkDirPath);

    // save deployment
    string memory jsonStr = vm.serializeAddress("{}", "address", contractAddr);
    string memory path = deploymentPath(versionName);
    debug("saving deployment to: ", path);
    vm.writeFile(path, jsonStr);
  }

  function saveAddresses(
    string memory versionName,
    address contractAddr
  ) internal {
    // save client addresses
    string[] memory paths = clientPaths();
    for (uint256 i = 0; i < paths.length; i++) {
      string memory clientPath = paths[i];
      debug("saving client address to: ", clientPath);
      vm.writeJson(
        vm.toString(contractAddr),
        clientPath,
        string.concat(".", vm.toString(block.chainid), ".", versionName)
      );
    }
  }

  function isAnvil() internal view returns (bool) {
    return block.chainid == 31337;
  }
}
