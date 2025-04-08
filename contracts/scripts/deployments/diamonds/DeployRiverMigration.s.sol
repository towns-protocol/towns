// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployPausable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployPausable.s.sol";

// contracts
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";
import {DeployTokenMigration} from "contracts/scripts/deployments/facets/DeployTokenMigration.s.sol";

contract DeployRiverMigration is DiamondHelper, Deployer {
    address OLD_TOKEN = 0x0000000000000000000000000000000000000000;
    address NEW_TOKEN = 0x0000000000000000000000000000000000000000;

    DeployFacet private facetHelper = new DeployFacet();
    DeployTokenMigration tokenMigrationHelper = new DeployTokenMigration();

    address multiInit;
    address diamondCut;
    address diamondLoupe;
    address introspection;
    address ownable;
    address pausable;
    address tokenMigration;

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
        multiInit = facetHelper.deploy("MultiInit", deployer);
        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        ownable = facetHelper.deploy("OwnableFacet", deployer);
        pausable = facetHelper.deploy("PausableFacet", deployer);

        addFacet(
            DeployDiamondCut.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            DeployDiamondCut.makeInitData()
        );
        addFacet(
            DeployDiamondLoupe.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            DeployDiamondLoupe.makeInitData()
        );
        addFacet(
            DeployIntrospection.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            DeployIntrospection.makeInitData()
        );
        addFacet(
            DeployOwnable.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            DeployOwnable.makeInitData(deployer)
        );
        addFacet(
            DeployPausable.makeCut(pausable, IDiamond.FacetCutAction.Add),
            pausable,
            DeployPausable.makeInitData()
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        tokenMigration = tokenMigrationHelper.deploy(deployer);

        (address oldToken, address newToken) = getTokens();

        addFacet(
            tokenMigrationHelper.makeCut(tokenMigration, IDiamond.FacetCutAction.Add),
            tokenMigration,
            tokenMigrationHelper.makeInitData(oldToken, newToken)
        );

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeWithSelector(
                    MultiInit.multiInit.selector,
                    _initAddresses,
                    _initDatas
                )
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
