// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Script} from "forge-std/Script.sol";
import {DeployHelpers} from "./DeployHelpers.s.sol";
import {Context} from "./Context.sol";

contract DeployBase is Context, DeployHelpers, Script {
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
  }

  // =============================================================
  //                      DEPLOYMENT HELPERS
  // =============================================================

  /// @notice returns the chain alias for the current chain
  function chainIdAlias() internal returns (string memory) {
    string memory chainAlias = block.chainid == 31337
      ? "base_anvil"
      : getChain(block.chainid).chainAlias;

    return getInitialStringFromUnderscore(chainAlias);
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

  function addressesPath(
    string memory contractName
  ) internal returns (string memory path) {
    path = string.concat(
      networkDirPath(),
      "/",
      "addresses",
      "/",
      contractName,
      ".json"
    );
  }

  function getDeployment(string memory versionName) internal returns (address) {
    string memory path = addressesPath(versionName);

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
    createDir(string.concat(networkDirPath(), "/", "addresses"));
    createChainIdFile(networkDirPath());

    // get deployment path
    string memory path = addressesPath(versionName);

    // save deployment
    string memory contractJson = vm.serializeAddress(
      "addresses",
      "address",
      contractAddr
    );
    debug("saving deployment to: ", path);
    vm.writeJson(contractJson, path);
  }

  // Utils
  function createChainIdFile(string memory networkDir) internal {
    string memory chainIdFilePath = string.concat(
      networkDir,
      "/",
      "chainId.json"
    );

    if (!exists(chainIdFilePath)) {
      debug("creating chain id file: ", chainIdFilePath);
      string memory jsonStr = vm.serializeUint("chainIds", "id", block.chainid);
      vm.writeJson(jsonStr, chainIdFilePath);
    }
  }

  function getInitialStringFromUnderscore(
    string memory fullString
  ) internal pure returns (string memory) {
    bytes memory fullStringBytes = bytes(fullString);
    uint256 underscoreIndex = 0;

    for (uint256 i = 0; i < fullStringBytes.length; i++) {
      if (fullStringBytes[i] == "_") {
        underscoreIndex = i;
        break;
      }
    }

    if (underscoreIndex == 0) {
      return fullString;
    }

    bytes memory result = new bytes(underscoreIndex);
    for (uint256 i = 0; i < underscoreIndex; i++) {
      result[i] = fullStringBytes[i];
    }

    return string(result);
  }
}
