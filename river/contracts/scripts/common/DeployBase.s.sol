// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Script} from "forge-std/Script.sol";
import {DeployHelpers} from "./DeployHelpers.s.sol";

contract DeployBase is DeployHelpers, Script {
  string internal constant DEPLOYMENT_CACHE_PATH = "contracts/deployments";

  constructor() {
    // set up chains
    setChain(
      "river",
      ChainData({
        name: "river",
        chainId: 550,
        rpcUrl: "https://mainnet.rpc.river.build/http"
      })
    );
    setChain(
      "river_anvil",
      ChainData({
        name: "river_anvil",
        chainId: 31338,
        rpcUrl: "http://localhost:8546"
      })
    );
    setChain(
      "river_devnet",
      ChainData({
        name: "river_devnet",
        chainId: 6524490,
        rpcUrl: "https://devnet.rpc.river.build"
      })
    );
    setChain(
      "base_sepolia",
      ChainData({
        name: "base_sepolia",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org"
      })
    );
  }

  // =============================================================
  //                      DEPLOYMENT HELPERS
  // =============================================================

  /// @notice returns the chain alias for the current chain
  function chainIdAlias() internal returns (string memory) {
    return
      block.chainid == 31337
        ? "base_anvil"
        : getChain(block.chainid).chainAlias;
  }

  function networkDirPath() internal returns (string memory path) {
    string memory context = vm.envOr("DEPLOYMENT_CONTEXT", string(""));

    // if no context is provided, use the default path
    if (bytes(context).length == 0) {
      context = string.concat(DEPLOYMENT_CACHE_PATH, "/", chainIdAlias());
    } else {
      context = string.concat(
        DEPLOYMENT_CACHE_PATH,
        "/",
        context,
        "/",
        chainIdAlias()
      );
    }

    path = string.concat(vm.projectRoot(), "/", context);
  }

  function cachePath(
    string memory contractName
  ) internal returns (string memory path) {
    path = string.concat(networkDirPath(), "/", contractName, ".json");
  }

  function getDeployment(string memory versionName) internal returns (address) {
    string memory path = cachePath(versionName);

    if (!exists(path)) {
      debug(
        string.concat(
          "no deployment found for ",
          versionName,
          " on ",
          chainIdAlias()
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
    if (vm.envOr("SAVE_DEPLOYMENTS", uint256(0)) == 0) {
      debug("(set SAVE_DEPLOYMENTS=1 to save deployments to file)");
      return;
    }

    // create addresses directory
    createDir(networkDirPath());

    // get deployment path
    string memory path = cachePath(versionName);

    // save deployment
    string memory jsonStr = vm.serializeAddress("{}", "address", contractAddr);
    debug("saving deployment to: ", path);
    vm.writeFile(path, jsonStr);
  }

  function isAnvil() internal view returns (bool) {
    return block.chainid == 31337 || block.chainid == 31338;
  }

  function isRiver() internal view returns (bool) {
    return block.chainid == 6524490;
  }

  function isTesting() internal view returns (bool) {
    return vm.envOr("IN_TESTING", false);
  }
}
