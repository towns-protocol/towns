// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Script} from "forge-std/Script.sol";
import {DeployHelpers} from "./DeployHelpers.s.sol";

contract DeployBase is DeployHelpers, Script {
  string internal constant DEPLOYMENT_CACHE_PATH = "packages/generated";

  constructor() {
    setChain(
      "river_anvil",
      ChainData({
        name: "river_anvil",
        chainId: 31338,
        rpcUrl: "http://localhost:8546"
      })
    );
    setChain(
      "river",
      ChainData({
        name: "river",
        chainId: 6524490,
        rpcUrl: "https://towns-devnet.rpc.caldera.xyz/http"
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
  function chainAlias() internal returns (string memory) {
    return
      isAnvil() || block.chainid == 31338
        ? "localhost"
        : getChain(block.chainid).chainAlias;
  }

  function deploymentContext() internal returns (string memory context) {
    context = vm.envOr("DEPLOYMENT_CONTEXT", string(""));

    // if no context is provided, use the default chain alias `contracts/deployments/<chainAlias>`
    if (bytes(context).length == 0) {
      context = string.concat(
        DEPLOYMENT_CACHE_PATH,
        "/",
        chainAlias(),
        "/addresses"
      );
    } else {
      context = string.concat(
        DEPLOYMENT_CACHE_PATH,
        "/",
        context,
        "/",
        chainAlias(),
        "/addresses"
      );
    }
  }

  function networkDirPath() internal returns (string memory path) {
    path = string.concat(vm.projectRoot(), "/", deploymentContext());
  }

  function createChainIdFile(string memory _networkDirPath) internal {
    string memory chainIdFilePath = string.concat(_networkDirPath, "/.chainId");
    if (!exists(chainIdFilePath)) {
      debug("creating chain id file: ", chainIdFilePath);
      vm.writeFile(chainIdFilePath, vm.toString(block.chainid));
    }
  }

  function deploymentPath(
    string memory contractName
  ) internal returns (string memory path) {
    path = string.concat(networkDirPath(), "/", contractName, ".json");
  }

  function getDeployment(string memory versionName) internal returns (address) {
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
    if (vm.envOr("SAVE_DEPLOYMENTS", uint256(0)) == 0) {
      debug("(set SAVE_DEPLOYMENTS=1 to save deployments to file)");
      return;
    }

    // make sure the network directory exists
    string memory _networkDirPath = networkDirPath();
    createDir(_networkDirPath);
    createChainIdFile(_networkDirPath);

    // save deployment
    string memory jsonStr = vm.serializeAddress("{}", "address", contractAddr);
    string memory path = deploymentPath(versionName);
    debug("saving deployment to: ", path);
    vm.writeFile(path, jsonStr);
  }

  function isAnvil() internal view returns (bool) {
    return block.chainid == 31337 || block.chainid == 31338;
  }
}
