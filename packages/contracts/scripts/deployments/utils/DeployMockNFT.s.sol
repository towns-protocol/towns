// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployMockERC721A} from "../../deployments/utils/DeployMockERC721A.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployMockNFT is DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "utils/mockNFT";
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up all facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("MockERC721A");

        // Deploy all facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Get deployed addresses
        multiInit = facetHelper.getDeployedAddress("MultiInit");

        // Add core facets
        address facet = facetHelper.getDeployedAddress("DiamondCutFacet");
        addFacet(
            DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("DiamondLoupeFacet");
        addFacet(
            DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("IntrospectionFacet");
        addFacet(
            DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployIntrospection.makeInitData()
        );

        // Add ERC721A mock
        facet = facetHelper.getDeployedAddress("MockERC721A");
        addCut(DeployMockERC721A.makeCut(facet, IDiamond.FacetCutAction.Add));

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function __deploy(address deployer) internal override returns (address) {
        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
