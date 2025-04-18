// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnablePending} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnablePending.s.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeploySwapRouterFacet} from "../facets/DeploySwapRouterFacet.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeploySwapRouter is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "swapRouter";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);

        address facet = facetHelper.deploy("DiamondCutFacet", deployer);
        addCut(DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add));
        addInit(facet, DeployDiamondCut.makeInitData());

        facet = facetHelper.deploy("DiamondLoupeFacet", deployer);
        addCut(DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add));
        addInit(facet, DeployDiamondLoupe.makeInitData());

        facet = facetHelper.deploy("IntrospectionFacet", deployer);
        addCut(DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add));
        addInit(facet, DeployIntrospection.makeInitData());

        facet = facetHelper.deploy("OwnablePendingFacet", deployer);
        addCut(DeployOwnablePending.makeCut(facet, IDiamond.FacetCutAction.Add));
        addInit(facet, DeployOwnablePending.makeInitData(deployer));
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        address facet = facetHelper.deploy("SwapRouter", deployer);
        addCut(DeploySwapRouterFacet.makeCut(facet, IDiamond.FacetCutAction.Add));

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitHelper(
        address deployer,
        string[] memory
    ) external override returns (FacetCut[] memory) {
        diamondInitParams(deployer);
        return this.getCuts();
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);
        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
