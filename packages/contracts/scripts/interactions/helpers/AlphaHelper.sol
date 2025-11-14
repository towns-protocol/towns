// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamondLoupe, IDiamondLoupeBase} from "@towns-protocol/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IOwnablePending} from "@towns-protocol/diamond/src/facets/ownable/pending/IOwnablePending.sol";
import {IDiamondInitHelper} from "scripts/deployments/diamonds/IDiamondInitHelper.sol";
import {IMetadata} from "src/diamond/facets/metadata/IMetadata.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {DiamondCutStorage} from "@towns-protocol/diamond/src/facets/cut/DiamondCutStorage.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {Interaction} from "scripts/common/Interaction.s.sol";

/// @dev note: struct fields must be in alphabetical order for the json parser to work
// see: https://book.getfoundry.sh/cheatcodes/parse-json
struct DiamondFacetData {
    string chainName;
    string diamond;
    FacetData[] facets;
    uint256 numFacets;
}

struct FacetData {
    address deployedAddress;
    string facetName;
    bytes32 sourceHash;
}

abstract contract AlphaHelper is Interaction, DiamondHelper, IDiamondLoupeBase {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using LibString for *;

    struct DiamondInfo {
        DiamondCutStorage.Layout layout;
        mapping(bytes4 selector => bool isCore) coreSelectors;
        mapping(bytes4 selector => bool isProposed) proposedSelectors;
    }

    mapping(address diamond => DiamondInfo info) private diamondInfos;

    /// @notice Get addresses of core facets that should never be removed
    /// @param diamond The diamond contract address
    /// @return coreFacets An array of core facet addresses
    function getCoreFacetAddresses(
        address diamond
    ) internal view returns (address[] memory coreFacets) {
        coreFacets = new address[](6);

        coreFacets[0] = IDiamondLoupe(diamond).facetAddress(IDiamondCut.diamondCut.selector);
        coreFacets[1] = IDiamondLoupe(diamond).facetAddress(IDiamondLoupe.facets.selector);
        coreFacets[2] = IDiamondLoupe(diamond).facetAddress(IERC165.supportsInterface.selector);
        coreFacets[3] = IDiamondLoupe(diamond).facetAddress(IERC173.owner.selector);
        coreFacets[4] = IDiamondLoupe(diamond).facetAddress(IOwnablePending.currentOwner.selector);
        coreFacets[5] = IDiamondLoupe(diamond).facetAddress(IMetadata.contractType.selector);
    }

    /// @notice Check if an address is a core facet that should not be removed
    /// @param facetAddress The facet address to check
    /// @param coreFacets Array of core facet addresses
    /// @return True if the address is a core facet
    function isCoreFacet(
        address facetAddress,
        address[] memory coreFacets
    ) internal pure returns (bool) {
        return contains(coreFacets, facetAddress);
    }

    /// @notice Execute a diamond cut to remove facets
    /// @param deployer The address that will execute the diamond cut
    /// @param diamond The diamond contract address
    function executeDiamondCut(address deployer, address diamond) internal {
        FacetCut[] memory cuts = baseFacets();
        if (cuts.length == 0) return;
        vm.broadcast(deployer);
        IDiamondCut(diamond).diamondCut(cuts, address(0), "");
        clearCuts();
    }

    /// @notice Remove all non-core facets from a diamond
    /// @param deployer The address that will execute the diamond cut
    /// @param diamond The diamond contract address
    function removeRemoteFacets(address deployer, address diamond) internal {
        Facet[] memory facets = IDiamondLoupe(diamond).facets();
        address[] memory coreFacets = getCoreFacetAddresses(diamond);

        for (uint256 i; i < facets.length; ++i) {
            address facet = facets[i].facet;

            if (isCoreFacet(facet, coreFacets)) {
                info("Skipping core facet: %s", facet);
                continue;
            }

            addCut(FacetCut(facet, FacetCutAction.Remove, facets[i].selectors));
        }

        executeDiamondCut(deployer, diamond);
    }

    /// @notice Remove specific facets from a diamond by address
    /// @param deployer The address that will execute the diamond cut
    /// @param diamond The diamond contract address
    /// @param facetAddresses Array of facet addresses to remove
    function removeRemoteFacetsByAddresses(
        address deployer,
        address diamond,
        address[] memory facetAddresses
    ) internal {
        addCutsToRemove(diamond, facetAddresses);
        executeDiamondCut(deployer, diamond);
    }

    /// @notice Add the facet cuts to remove from a diamond
    /// @param diamond The diamond contract address
    /// @param facetAddresses Array of facet addresses to remove
    function addCutsToRemove(address diamond, address[] memory facetAddresses) internal {
        Facet[] memory facets = IDiamondLoupe(diamond).facets();
        address[] memory coreFacets = getCoreFacetAddresses(diamond);

        for (uint256 i; i < facets.length; ++i) {
            address facet = facets[i].facet;

            if (isCoreFacet(facet, coreFacets)) {
                continue;
            }

            if (contains(facetAddresses, facet)) {
                addCut(FacetCut(facet, FacetCutAction.Remove, facets[i].selectors));
            }
        }
    }

    /// @notice Generate smart cuts by comparing proposed cuts with existing diamond state
    function generateSmartCuts(
        address diamond,
        FacetCut[] memory proposedCuts
    ) internal returns (FacetCut[] memory) {
        buildDiamondInfo(diamond, proposedCuts);

        // Collect cuts to execute
        clearCuts();

        for (uint256 i; i < proposedCuts.length; ++i) {
            processFacetCut(diamond, proposedCuts[i]);
        }

        addRemovalCuts(diamond);

        return baseFacets();
    }

    /// @notice Build diamond facet mapping from current state
    function buildDiamondInfo(address diamond, FacetCut[] memory proposedCuts) internal {
        DiamondInfo storage info = diamondInfos[diamond];

        Facet[] memory facets = IDiamondLoupe(diamond).facets();
        address[] memory coreFacetAddresses = getCoreFacetAddresses(diamond);

        for (uint256 i; i < facets.length; ++i) {
            address facetAddr = facets[i].facet;
            bytes4[] memory selectors = facets[i].selectors;
            bool isCore = contains(coreFacetAddresses, facetAddr);

            info.layout.facets.add(facetAddr);

            for (uint256 j; j < selectors.length; ++j) {
                bytes4 selector = selectors[j];
                info.layout.facetBySelector[selector] = facetAddr;
                info.layout.selectorsByFacet[facetAddr].add(selector);

                if (isCore) info.coreSelectors[selector] = true;
            }
        }

        // Mark all selectors in proposed cuts as handled
        for (uint256 i; i < proposedCuts.length; ++i) {
            bytes4[] memory selectors = proposedCuts[i].functionSelectors;
            for (uint256 j; j < selectors.length; ++j) {
                info.proposedSelectors[selectors[j]] = true;
            }
        }
    }

    /// @notice Process a single facet cut by analyzing selector conflicts with existing diamond state
    /// @dev Determines minimal diamond cuts needed by categorizing selectors as Add or Replace operations
    /// @param diamond The diamond contract address to analyze against
    /// @param cut The proposed facet cut to process
    function processFacetCut(address diamond, FacetCut memory cut) internal {
        DiamondInfo storage info = diamondInfos[diamond];
        address newFacet = cut.facetAddress;
        bytes4[] memory newSelectors = cut.functionSelectors;

        // Skip if exact facet already exists (CREATE2 deterministic deployment)
        // This prevents redundant cuts for already-deployed facets
        if (info.layout.facets.contains(newFacet)) return;

        // Create dynamic arrays for this facet's selectors
        DynamicArrayLib.DynamicArray memory addSelectors = DynamicArrayLib.p();
        DynamicArrayLib.DynamicArray memory replaceSelectors = DynamicArrayLib.p();

        // Categorize each selector based on current diamond state
        for (uint256 i; i < newSelectors.length; ++i) {
            bytes4 selector = newSelectors[i];
            address existingFacet = info.layout.facetBySelector[selector];

            if (existingFacet == address(0)) {
                // Selector doesn't exist - needs Add operation
                addSelectors.p(selector);
            } else if (existingFacet != newFacet) {
                // Selector exists on different facet - needs Replace operation
                replaceSelectors.p(selector);
            }
            // If existingFacet == newFacet, selector already points to correct facet - no action needed
        }

        // Generate Add cut for new selectors
        if (addSelectors.length() > 0) {
            addCut(FacetCut(newFacet, FacetCutAction.Add, asBytes4Array(addSelectors)));
        }

        // Generate Replace cut for conflicting selectors
        if (replaceSelectors.length() > 0) {
            addCut(FacetCut(newFacet, FacetCutAction.Replace, asBytes4Array(replaceSelectors)));
        }
    }

    /// @notice Add removal cuts for orphaned selectors
    function addRemovalCuts(address diamond) internal {
        DiamondInfo storage info = diamondInfos[diamond];

        address[] memory existingFacets = info.layout.facets.values();
        for (uint256 i; i < existingFacets.length; ++i) {
            address facetAddr = existingFacets[i];
            bytes32[] memory existingSelectors = info.layout.selectorsByFacet[facetAddr].values();

            // Create dynamic array for remove selectors
            DynamicArrayLib.DynamicArray memory removeSelectors = DynamicArrayLib.p();

            for (uint256 j; j < existingSelectors.length; ++j) {
                bytes4 selector = bytes4(existingSelectors[j]);
                if (!(info.proposedSelectors[selector] || info.coreSelectors[selector])) {
                    removeSelectors.p(selector);
                }
            }

            if (removeSelectors.length() > 0) {
                addCut(FacetCut(facetAddr, FacetCutAction.Remove, asBytes4Array(removeSelectors)));
            }
        }
    }

    /// @notice Execute diamond cuts with smart cut optimization and logging
    /// @param deployer The address that will execute the diamond cut
    /// @param diamond The diamond contract address
    /// @param diamondName Name of the diamond for logging purposes
    /// @param deployContract The deployment contract that provides cuts and initialization
    /// @param initAddress Optional initialization contract address
    /// @param initData Optional initialization data
    function executeDiamondCutsWithLogging(
        address deployer,
        address diamond,
        string memory diamondName,
        IDiamondInitHelper deployContract,
        address initAddress,
        bytes memory initData
    ) internal {
        info(string.concat("=== Upgrading ", diamondName, " diamond ==="), "");

        deployContract.diamondInitParams(deployer);
        FacetCut[] memory proposedCuts = DiamondHelper(address(deployContract)).getCuts();
        FacetCut[] memory smartCuts = generateSmartCuts(diamond, proposedCuts);

        info(
            string.concat(
                "Generated ",
                smartCuts.length.toString(),
                " smart cuts from ",
                proposedCuts.length.toString(),
                " proposed cuts"
            ),
            ""
        );

        if (smartCuts.length > 0) {
            vm.broadcast(deployer);
            IDiamondCut(diamond).diamondCut(smartCuts, initAddress, initData);
            info(string.concat(unicode"✅ ", diamondName, " diamond upgrade completed"), "");
        } else {
            info(string.concat(diamondName, " diamond already up to date - no cuts needed"), "");
        }
    }

    /// @notice Execute diamond cuts with smart cut optimization and logging (no initialization)
    /// @param deployer The address that will execute the diamond cut
    /// @param diamond The diamond contract address
    /// @param diamondName Name of the diamond for logging purposes
    /// @param deployContract The deployment contract that provides cuts and initialization
    function executeDiamondCutsWithLogging(
        address deployer,
        address diamond,
        string memory diamondName,
        IDiamondInitHelper deployContract
    ) internal {
        executeDiamondCutsWithLogging(
            deployer,
            diamond,
            diamondName,
            deployContract,
            address(0),
            ""
        );
    }

    function asBytes4Array(
        DynamicArrayLib.DynamicArray memory input
    ) internal pure returns (bytes4[] memory selectors) {
        bytes32[] memory selectors_ = input.asBytes32Array();
        assembly ("memory-safe") {
            selectors := selectors_
        }
    }

    /// @notice Check if an address is in an array of addresses
    function contains(address[] memory facetAddresses, address facet) internal pure returns (bool) {
        for (uint256 i; i < facetAddresses.length; ++i) {
            if (facet == facetAddresses[i]) return true;
        }
        return false;
    }
}
