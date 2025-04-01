// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries
import {LibString} from "solady/utils/LibString.sol";

//contracts
import {Script} from "forge-std/Script.sol";
import {DeployHelpers} from "./DeployHelpers.s.sol";
import {Context} from "./Context.sol";

contract DeployBase is Context, DeployHelpers, Script {
  constructor() {
    // set up chains
    setChain(
      "river",
      ChainData({name: "river", chainId: 550, rpcUrl: "https://mainnet.rpc.river.build/http"})
    );
    setChain(
      "river_anvil",
      ChainData({name: "river_anvil", chainId: 31_338, rpcUrl: "http://localhost:8546"})
    );
    setChain(
      "river_devnet",
      ChainData({name: "river_devnet", chainId: 6_524_490, rpcUrl: "https://devnet.rpc.river.build"})
    );
  }

  // =============================================================
  //                      DEPLOYMENT HELPERS
  // =============================================================

  /// @notice returns the chain alias for the current chain
  function chainIdAlias() internal returns (string memory) {
    string memory chainAlias =
      block.chainid == 31_337 ? "base_anvil" : getChain(block.chainid).chainAlias;
    return getInitialStringFromChar(chainAlias, "_", chainAlias);
  }

  function networkDirPath() internal returns (string memory path) {
    string memory context = getDeploymentContext();
    string memory chainAlias = chainIdAlias();

    // if no context is provided, use the default path
    if (bytes(context).length == 0) {
      context = string.concat(DEPLOYMENT_CACHE_PATH, "/", chainAlias);
    } else {
      context = string.concat(DEPLOYMENT_CACHE_PATH, "/", context, "/", chainAlias);
    }

    path = string.concat(vm.projectRoot(), "/", context);
  }

  function getDeployment(
    string memory versionName
  ) internal returns (address) {
    string memory networkDir = networkDirPath();
    string memory path = addressesPath(versionName, networkDir);

    if (!exists(path)) {
      debug(string.concat("no deployment found for ", versionName, " on ", chainIdAlias()));
      return address(0);
    }

    string memory data = vm.readFile(path);
    return vm.parseJsonAddress(data, ".address");
  }

  function saveDeployment(string memory versionName, address contractAddr) internal {
    if (!shouldSaveDeployments()) {
      debug("(set SAVE_DEPLOYMENTS=1 to save deployments to file)");
      return;
    }

    string memory networkDir = networkDirPath();

    // create addresses directory
    createDir(string.concat(networkDir, "/", "addresses"));
    createChainIdFile(networkDir);

    // Get directory from version name if it contains a "/"
    string memory typeDir = getInitialStringFromChar(versionName, "/", "");
    if (bytes(typeDir).length > 0) {
      createDir(string.concat(networkDir, "/", "addresses", "/", typeDir));
    }

    // get deployment path
    string memory path = addressesPath(versionName, networkDir);

    // save deployment
    string memory contractJson = vm.serializeAddress("addresses", "address", contractAddr);
    debug("saving deployment to: ", path);
    vm.writeJson(contractJson, path);
  }

  // Utils
  function addressesPath(
    string memory versionName,
    string memory networkDir
  ) internal pure returns (string memory path) {
    return string.concat(networkDir, "/addresses/", versionName, ".json");
  }

  function createChainIdFile(
    string memory networkDir
  ) internal {
    string memory chainIdFilePath = string.concat(networkDir, "/chainId.json");

    if (!exists(chainIdFilePath)) {
      debug("creating chain id file: ", chainIdFilePath);
      string memory jsonStr = vm.serializeUint("chainIds", "id", block.chainid);
      vm.writeJson(jsonStr, chainIdFilePath);
    }
  }

  function getInitialStringFromChar(
    string memory fullString,
    string memory char,
    string memory replacement
  ) internal pure returns (string memory) {
    uint256 charIndex = LibString.indexOf(fullString, char);
    if (charIndex == LibString.NOT_FOUND) {
      return replacement;
    }
    return LibString.slice(fullString, 0, charIndex);
  }
}
