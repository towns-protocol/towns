// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "@river-build/diamond/src/facets/cut/IDiamondCut.sol";
// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {IDiamond, Diamond} from "@river-build/diamond/src/Diamond.sol";

contract InteractMigration is Interaction {
  using EnumerableSetLib for EnumerableSetLib.AddressSet;

  struct PendingFacet {
    string action;
    string diamond;
    string facetAddress;
    string facetContract;
  }

  EnumerableSetLib.AddressSet internal pendingDiamonds;
  mapping(address diamond => IDiamond.FacetCut[] cuts) public pendingCuts;

  function __interact(address deployer) internal override {
    string memory config = _migrationConfigPath();
    string memory configJson = vm.readFile(config);
    string memory network = vm.envOr("rpc", string(""));

    PendingFacet[] memory facets = _getPendingFacets(configJson, network);

    for (uint256 i = 0; i < facets.length; i++) {
      _processFacet(facets[i]);
    }

    for (uint256 i = 0; i < pendingDiamonds.length(); i++) {
      address diamond = pendingDiamonds.at(i);

      vm.startBroadcast(deployer);
      IDiamondCut(diamond).diamondCut(pendingCuts[diamond], address(0), "");
      vm.stopBroadcast();
    }
  }

  function _migrationConfigPath() internal view returns (string memory path) {
    string memory context = vm.envOr("DEPLOYMENT_CONTEXT", string(""));
    path = string.concat(
      vm.projectRoot(),
      "/contracts/scripts/migrations/",
      context,
      ".json"
    );
  }

  function _processFacet(PendingFacet memory facet) internal {
    // Get the diamond address
    address diamond = getDeployment(facet.diamond);
    address facetAddress = getDeployment(facet.facetAddress);

    // Get the selectors from the facet
    bytes4[] memory selectors = _getSelectorsFromContract(facet.facetContract);

    pendingDiamonds.add(diamond);
    pendingCuts[diamond].push(
      IDiamond.FacetCut({
        facetAddress: facetAddress,
        action: _stringToFacetCutAction(facet.action),
        functionSelectors: selectors
      })
    );
  }

  function _getSelectorsFromContract(
    string memory contractName
  ) internal returns (bytes4[] memory) {
    // Use vm.parseJson to get function selectors
    string[] memory cmd = new string[](4);
    cmd[0] = "forge";
    cmd[1] = "inspect";
    cmd[2] = contractName;
    cmd[3] = "methodIdentifiers";

    bytes memory res = vm.ffi(cmd);
    string memory json = string(res);

    // Get all keys (function signatures)
    string[] memory keys = vm.parseJsonKeys(json, "$");

    // First count how many valid functions we have (excluding __ functions)
    uint256 validCount = 0;
    for (uint256 i = 0; i < keys.length; i++) {
      bytes memory funcName = bytes(keys[i]);
      // Skip if function starts with '__'
      if (funcName.length < 2 || funcName[0] != "_" || funcName[1] != "_") {
        validCount++;
      }
    }

    bytes4[] memory selectors = new bytes4[](validCount);
    uint256 selectorIndex = 0;

    for (uint256 i = 0; i < keys.length; i++) {
      bytes memory funcName = bytes(keys[i]);
      // Skip if function starts with '__'
      if (funcName.length < 2 || funcName[0] != "_" || funcName[1] != "_") {
        // Get the selector for this function signature
        // Need to escape the key by wrapping in [''] to handle special characters
        string memory jsonPath = string.concat("$['", keys[i], "']");
        string memory selector = vm.parseJsonString(json, jsonPath);

        // Convert hex string to bytes4
        bytes memory selectorBytes = vm.parseBytes(selector);
        bytes4 selectorBytes4;
        assembly {
          selectorBytes4 := mload(add(selectorBytes, 32))
        }
        selectors[selectorIndex] = selectorBytes4;
        selectorIndex++;
      }
    }

    return selectors;
  }

  function _stringToFacetCutAction(
    string memory action
  ) internal pure returns (IDiamond.FacetCutAction) {
    bytes32 actionHash = keccak256(bytes(action));
    if (actionHash == keccak256(bytes("Add")))
      return IDiamond.FacetCutAction.Add;
    if (actionHash == keccak256(bytes("Replace")))
      return IDiamond.FacetCutAction.Replace;
    if (actionHash == keccak256(bytes("Remove")))
      return IDiamond.FacetCutAction.Remove;
    revert("Invalid FacetCutAction");
  }

  function _getPendingFacets(
    string memory configJson,
    string memory network
  ) internal pure returns (PendingFacet[] memory) {
    string memory facetsPath = string.concat(
      ".networks.",
      network,
      ".pendingFacets"
    );
    bytes memory pendingFacetsRaw = vm.parseJson(configJson, facetsPath);

    // Parse the pending facets array into our struct
    PendingFacet[] memory facets = abi.decode(
      pendingFacetsRaw,
      (PendingFacet[])
    );

    return facets;
  }
}
