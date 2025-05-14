// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployPausable.sol";
import {DeployTokenMigration} from "../facets/DeployTokenMigration.s.sol";

// contracts
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployRiverMigration is DiamondHelper, Deployer {
    address private OLD_TOKEN;
    address private NEW_TOKEN;

    DeployFacet private facetHelper = new DeployFacet();
    address private multiInit;

    function versionName() public pure override returns (string memory) {
        return "riverMigration";
    }

    function setTokens(address _oldToken, address _newToken) external {
        OLD_TOKEN = _oldToken;
        NEW_TOKEN = _newToken;
    }

    function getTokens() public returns (address, address) {
        if (OLD_TOKEN == address(0) && NEW_TOKEN == address(0)) {
            return (getDeployment("oldRiver"), getDeployment("river"));
        }

        return (OLD_TOKEN, NEW_TOKEN);
    }

    function addImmutableCuts(address deployer) internal {
        // Queue up all core facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");
        facetHelper.add("PausableFacet");

        // Get predicted addresses
        multiInit = facetHelper.predictAddress("MultiInit");

        address facet = facetHelper.predictAddress("DiamondCutFacet");
        addFacet(
            DeployDiamondCut.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.predictAddress("DiamondLoupeFacet");
        addFacet(
            DeployDiamondLoupe.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.predictAddress("IntrospectionFacet");
        addFacet(
            DeployIntrospection.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.predictAddress("OwnableFacet");
        addFacet(
            DeployOwnable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployOwnable.makeInitData(deployer)
        );

        facet = facetHelper.predictAddress("PausableFacet");
        addFacet(
            DeployPausable.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployPausable.makeInitData()
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up feature facet for batch deployment
        facetHelper.add("TokenMigrationFacet");

        // Deploy all facets in a single batch transaction
        facetHelper.deployBatch(deployer);

        // Get deployed address
        address facet = facetHelper.getDeployedAddress("TokenMigrationFacet");

        (address oldToken, address newToken) = getTokens();

        addFacet(
            DeployTokenMigration.makeCut(facet, IDiamond.FacetCutAction.Add),
            facet,
            DeployTokenMigration.makeInitData(oldToken, newToken)
        );

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function __deploy(address deployer) internal override returns (address) {
        addImmutableCuts(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);
        return address(diamond);
    }
}
