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
  function versionAlias() internal view returns (string memory) {
    return isAnvil() || block.chainid == 31338 ? "dev" : "v3";
  }

  function deploymentContext() internal returns (string memory context) {
    context = vm.envOr("DEPLOYMENT_CONTEXT", string(""));

    // if no context is provided, use the default chain alias `contracts/deployments/<versionAlias>`
    if (bytes(context).length == 0) {
      context = string.concat(
        DEPLOYMENT_CACHE_PATH,
        "/",
        versionAlias(),
        "/addresses"
      );
    } else {
      context = string.concat(
        DEPLOYMENT_CACHE_PATH,
        "/",
        context,
        "/",
        versionAlias(),
        "/addresses"
      );
    }
  }

  function networkDirPath() internal returns (string memory path) {
    path = string.concat(vm.projectRoot(), "/", deploymentContext());
  }

  function upsertChainIdFile(
    string memory _networkDirPath,
    address contractAddr
  ) internal {
    string memory chainIdFilePath = string.concat(_networkDirPath, "/.chainId");
    if (!exists(chainIdFilePath)) {
      debug("creating chain id file: ", chainIdFilePath);
      vm.writeFile(
        chainIdFilePath,
        string.concat(
          vm.toString(contractAddr),
          string.concat(":", vm.toString(block.chainid))
        )
      );
    } else {
      debug("writing chain id to file: ", chainIdFilePath);
      vm.writeLine(
        chainIdFilePath,
        string.concat(
          vm.toString(contractAddr),
          string.concat(":", vm.toString(block.chainid))
        )
      );
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
          versionAlias()
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

    string memory path;
    string memory pathOverride = vm.envOr("SAVE_DEPLOYMENTS_PATH", string(""));
    if (bytes(pathOverride).length > 0) {
      string memory dirPath = string.concat(
        vm.projectRoot(),
        "/",
        pathOverride
      );
      createDir(dirPath);
      path = string.concat(dirPath, "/", versionName, ".json");
      info("Saving contract address to overridden path: ", path);
    } else {
      // make sure the network directory exists
      string memory _networkDirPath = networkDirPath();
      createDir(_networkDirPath);
      upsertChainIdFile(_networkDirPath, contractAddr);

      path = deploymentPath(versionName);
    }

    // save deployment
    string memory jsonStr = vm.serializeAddress("{}", "address", contractAddr);
    debug("saving deployment to: ", path);
    vm.writeFile(path, jsonStr);
  }

  function isAnvil() internal view returns (bool) {
    return block.chainid == 31337 || block.chainid == 31338;
  }

  function isTesting() internal returns (bool) {
    return vm.envOr("IN_TESTING", false);
  }
}
