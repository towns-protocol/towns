// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

// libraries
import {stdJson} from "forge-std/StdJson.sol";
import "forge-std/console.sol";

// contracts
import {AlphaHelper, DiamondFacetData, FacetData} from "contracts/scripts/interactions/helpers/AlphaHelper.sol";

import {DeployRiverRegistry} from "contracts/scripts/deployments/diamonds/DeployRiverRegistry.s.sol";
import {IDiamondInitHelper} from "contracts/test/diamond/Diamond.t.sol";

contract InteractRiverAlphaSparse is AlphaHelper {
  mapping(string => address) private diamondDeployments;

  constructor() {
    diamondDeployments["riverRegistry"] = address(new DeployRiverRegistry());
  }

  string constant DEFAULT_JSON_FILE = "compiled_source_diff.json";
  string constant DEFAULT_REPORT_PATH = "/scripts/bytecode-diff/source-diffs/";

  string private jsonData;

  function readJSON(string memory jsonPath) internal {
    jsonData = vm.readFile(jsonPath);
  }

  /**
   * @notice Decodes diamond and facet data from a JSON file output by the bytecode-diff script
   * @dev Reads the JSON file specified by the DEFAULT_JSON_FILE constant
   *      and parses it to extract information about updated diamonds and their facets
   * @return An array of DiamondFacetData structs containing the decoded information
   */

  function decodeDiamondsFromJSON()
    internal
    view
    returns (DiamondFacetData[] memory)
  {
    uint256 updatedDiamondLen = abi.decode(
      vm.parseJson(jsonData, ".numUpdated"),
      (uint256)
    );
    DiamondFacetData[] memory diamonds = new DiamondFacetData[](
      updatedDiamondLen
    );

    for (uint256 i = 0; i < updatedDiamondLen; i++) {
      // Decode diamond name and number of facets
      DiamondFacetData memory diamondData = abi.decode(
        vm.parseJson(
          jsonData,
          string.concat("$.updated[", vm.toString(i), "]")
        ),
        (DiamondFacetData)
      );

      diamonds[i] = diamondData;
    }

    return diamonds;
  }

  /**
   * @notice Processes diamond and facet updates based on JSON input
   * @dev This function reads a JSON file containing information about diamond and facet updates,
   *      then applies these updates to the corresponding diamonds. It performs the following steps:
   *      1. Sets the OVERRIDE_DEPLOYMENTS environment variable
   *      2. Determines the JSON input path (either from INTERACTION_INPUT_PATH env var or using a default)
   *      3. Reads and decodes the JSON data
   *      4. Iterates through each diamond update:
   *         - Identifies the diamond type (space, spaceOwner, spaceFactory, or baseRegistry)
   *         - Removes existing facets that are to be updated
   *         - Prepares new facet cuts
   *         - Executes a diamondCut operation to apply the updates
   * @param deployer The address of the account that will deploy and interact with the contracts
   */
  function __interact(address deployer) internal override {
    vm.setEnv("OVERRIDE_DEPLOYMENTS", "1");

    string memory jsonPath;
    try vm.envString("INTERACTION_INPUT_PATH") returns (string memory path) {
      jsonPath = string.concat(vm.projectRoot(), path);
    } catch {
      jsonPath = string.concat(
        vm.projectRoot(),
        DEFAULT_REPORT_PATH,
        DEFAULT_JSON_FILE
      );
    }

    readJSON(jsonPath);

    DiamondFacetData[] memory diamonds = decodeDiamondsFromJSON();

    // Iterate over diamonds array and process each diamond
    for (uint256 i = 0; i < diamonds.length; i++) {
      console.log("interact::diamondName", diamonds[i].diamond);
      string memory diamondName = diamonds[i].diamond;
      address diamondDeployedAddress;
      FacetCut[] memory newCuts;
      uint256 numFacets = diamonds[i].facets.length;
      string[] memory facetNames = new string[](numFacets);
      address[] memory facetAddresses = new address[](numFacets);

      for (uint256 j = 0; j < numFacets; j++) {
        FacetData memory facetData = diamonds[i].facets[j];
        facetAddresses[j] = facetData.deployedAddress;
        facetNames[j] = facetData.facetName;
      }

      address diamondHelper = diamondDeployments[diamondName];
      if (diamondHelper != address(0)) {
        console.log("interact::diamondDeployedName", diamondName);
        diamondDeployedAddress = getDeployment(diamondName);
        removeRemoteFacetsByAddresses(
          deployer,
          diamondDeployedAddress,
          facetAddresses
        );
        newCuts = IDiamondInitHelper(diamondHelper).diamondInitHelper(
          deployer,
          facetNames
        );

        vm.broadcast(deployer);
        IDiamondCut(diamondDeployedAddress).diamondCut(newCuts, address(0), "");
      }
    }
  }
}
