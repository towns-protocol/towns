// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondLoupe, IDiamondLoupeBase} from "contracts/src/diamond/facets/loupe/IDiamondLoupe.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IOwnablePending} from "contracts/src/diamond/facets/ownable/pending/IOwnablePending.sol";

import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";

// libraries
import {stdJson} from "forge-std/StdJson.sol";
import "forge-std/console.sol";

// contracts
import {DeployHelpers} from "../common/DeployHelpers.s.sol";
import {AlphaHelper} from "contracts/scripts/interactions/helpers/AlphaHelper.sol";

import {DeploySpace} from "contracts/scripts/deployments/diamonds/DeploySpace.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";

contract InteractAlphaSparse is AlphaHelper {
  using stdJson for string;

  DeploySpace deploySpace = new DeploySpace();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();

  string constant DEFAULT_JSON_FILE = "compiled_source_diff.json";
  string constant DEFAULT_REPORT_PATH = "/scripts/bytecode-diff/source-diffs/";

  struct DiamondFacets {
    string diamond;
    FacetData[] facets;
    uint256 numFacets;
  }

  struct FacetData {
    address deployedAddress;
    string facetName;
    bytes32 sourceHash;
  }

  string private jsonData;

  function readJSON(string memory jsonPath) internal {
    jsonData = vm.readFile(jsonPath);
  }

  /**
   * @notice Decodes diamond and facet data from a JSON file output by the bytecode-diff script
   * @dev Reads the JSON file specified by the DEFAULT_JSON_FILE constant
   *      and parses it to extract information about updated diamonds and their facets
   * @return An array of DiamondFacets structs containing the decoded information
   */

  function decodeDiamondsFromJSON()
    internal
    view
    returns (DiamondFacets[] memory)
  {
    uint256 updatedDiamondLen = abi.decode(
      vm.parseJson(jsonData, ".numUpdated"),
      (uint256)
    );
    DiamondFacets[] memory diamonds = new DiamondFacets[](updatedDiamondLen);

    for (uint256 i = 0; i < updatedDiamondLen; i++) {
      // Decode diamond name and number of facets
      DiamondFacets memory diamondData = abi.decode(
        vm.parseJson(
          jsonData,
          string.concat("$.updated[", vm.toString(i), "]")
        ),
        (DiamondFacets)
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

    DiamondFacets[] memory diamonds = decodeDiamondsFromJSON();

    // Iterate over diamonds array and process each diamond
    for (uint256 i = 0; i < diamonds.length; i++) {
      console.log("interact::diamondName", diamonds[i].diamond);
      string memory diamondName = diamonds[i].diamond;
      address diamondAddress;
      FacetCut[] memory newCuts;
      uint256 numFacets = diamonds[i].facets.length;
      string[] memory facetNames = new string[](numFacets);
      address[] memory facetAddresses = new address[](numFacets);

      for (uint256 j = 0; j < numFacets; j++) {
        FacetData memory facetData = diamonds[i].facets[j];
        facetAddresses[j] = facetData.deployedAddress;
        facetNames[j] = facetData.facetName;
      }

      bytes32 diamondNameHash = keccak256(abi.encodePacked(diamondName));

      if (diamondNameHash == keccak256(abi.encodePacked("space"))) {
        // deploy space diamond by facets
        diamondAddress = getDeployment("space");
        removeRemoteFacetsByAddresses(deployer, diamondAddress, facetAddresses);
        deploySpace.diamondInitParamsFromFacets(deployer, facetNames);
        newCuts = deploySpace.getCuts();
      } else if (diamondNameHash == keccak256(abi.encodePacked("spaceOwner"))) {
        //  deploy spaceOwner diamond by facets
        diamondAddress = getDeployment("spaceOwner");
        removeRemoteFacetsByAddresses(deployer, diamondAddress, facetAddresses);
        deploySpaceOwner.diamondInitParamsFromFacets(deployer, facetNames);
        newCuts = deploySpaceOwner.getCuts();
      } else if (
        diamondNameHash == keccak256(abi.encodePacked("spaceFactory"))
      ) {
        // deploy spaceFactory diamond by facets
        diamondAddress = getDeployment("spaceFactory");
        removeRemoteFacetsByAddresses(deployer, diamondAddress, facetAddresses);
        deploySpaceFactory.diamondInitParamsFromFacets(deployer, facetNames);
        newCuts = deploySpaceFactory.getCuts();
      } else if (
        diamondNameHash == keccak256(abi.encodePacked("baseRegistry"))
      ) {
        // deploy baseRegistry diamond by facets
        diamondAddress = getDeployment("baseRegistry");
        removeRemoteFacetsByAddresses(deployer, diamondAddress, facetAddresses);
        deployBaseRegistry.diamondInitParamsFromFacets(deployer, facetNames);
        newCuts = deployBaseRegistry.getCuts();
      } else {
        console.log("Unknown diamond:", diamondName);
        continue;
      }

      vm.broadcast(deployer);
      IDiamondCut(diamondAddress).diamondCut(newCuts, address(0), "");
    }
  }
}
