// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";
import {DeployAccountHubFacet} from "../facets/DeployAccountHubFacet.s.sol";
import {DeployAppManagerFacet} from "../facets/DeployAppManagerFacet.s.sol";
import {DeployAccountTippingFacet} from "../facets/DeployAccountTippingFacet.s.sol";
import {DeployDMGatingFacet} from "../facets/DeployDMGatingFacet.s.sol";
import {DeploySpaceFactory} from "./DeploySpaceFactory.s.sol";
import {DeployAppRegistry} from "./DeployAppRegistry.s.sol";
import {LibString} from "solady/utils/LibString.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeployAccountModules is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();
    DeploySpaceFactory private deploySpaceFactory = new DeploySpaceFactory();
    DeployAppRegistry private deployAppRegistry = new DeployAppRegistry();

    address public spaceFactory;
    address public appRegistry;

    bytes32 internal constant METADATA_NAME = bytes32("AccountModules");

    function versionName() public pure override returns (string memory) {
        return "accountModules";
    }

    function setDependencies(address spaceFactory_, address appRegistry_) external {
        spaceFactory = spaceFactory_;
        appRegistry = appRegistry_;
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        for (uint256 i; i < facetNames.length; ++i) {
            facetHelper.add(facetNames[i]);
        }

        facetHelper.deployBatch(deployer);

        for (uint256 i; i < facetNames.length; ++i) {
            string memory facetName = facetNames[i];
            address facet = facetHelper.getDeployedAddress(facetName);

            if (facetName.eq("AccountHubFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAccountHubFacet.selectors()));
            }
            if (facetName.eq("AppManagerFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAppManagerFacet.selectors()));
            }
            if (facetName.eq("AccountTippingFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployAccountTippingFacet.selectors()));
            }
            if (facetName.eq("DMGatingFacet")) {
                addCut(makeCut(facet, FacetCutAction.Add, DeployDMGatingFacet.selectors()));
            }
        }

        return baseFacets();
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        // Queue up feature facets for batch deployment
        facetHelper.add("MultiInit");
        facetHelper.add("MetadataFacet");
        facetHelper.add("AccountHubFacet");
        facetHelper.add("AppManagerFacet");
        facetHelper.add("AccountTippingFacet");
        facetHelper.add("DMGatingFacet");

        facetHelper.deployBatch(deployer);

        // Add feature facets
        address facet = facetHelper.getDeployedAddress("MetadataFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployMetadata.selectors()),
            facet,
            DeployMetadata.makeInitData(METADATA_NAME, "")
        );

        facet = facetHelper.getDeployedAddress("AccountHubFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAccountHubFacet.selectors()),
            facet,
            DeployAccountHubFacet.makeInitData(spaceFactory, appRegistry)
        );

        facet = facetHelper.getDeployedAddress("AppManagerFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAppManagerFacet.selectors()),
            facet,
            DeployAppManagerFacet.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("AccountTippingFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployAccountTippingFacet.selectors()),
            facet,
            DeployAccountTippingFacet.makeInitData()
        );

        facet = facetHelper.getDeployedAddress("DMGatingFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDMGatingFacet.selectors()),
            facet,
            DeployDMGatingFacet.makeInitData()
        );

        address multiInit = facetHelper.getDeployedAddress("MultiInit");

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Internal                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _resolveDependencies(address deployer) internal {
        spaceFactory = spaceFactory == address(0)
            ? deploySpaceFactory.deploy(deployer)
            : spaceFactory;
        appRegistry = appRegistry == address(0) ? deployAppRegistry.deploy(deployer) : appRegistry;
    }

    function _coreFacets(address deployer) internal {
        // Deploy dependencies
        _resolveDependencies(deployer);

        // Queue up all core facets for batch deployment
        facetHelper.add("DiamondCutFacet");
        facetHelper.add("DiamondLoupeFacet");
        facetHelper.add("IntrospectionFacet");
        facetHelper.add("OwnableFacet");

        // Get predicted addresses
        address facet = facetHelper.predictAddress("DiamondCutFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondCut.selectors()),
            facet,
            DeployDiamondCut.makeInitData()
        );

        facet = facetHelper.predictAddress("DiamondLoupeFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployDiamondLoupe.selectors()),
            facet,
            DeployDiamondLoupe.makeInitData()
        );

        facet = facetHelper.predictAddress("IntrospectionFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployIntrospection.selectors()),
            facet,
            DeployIntrospection.makeInitData()
        );

        facet = facetHelper.predictAddress("OwnableFacet");
        addFacet(
            makeCut(facet, FacetCutAction.Add, DeployOwnable.selectors()),
            facet,
            DeployOwnable.makeInitData(deployer)
        );
    }

    function __deploy(address deployer) internal override returns (address) {
        _coreFacets(deployer);

        Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

        vm.broadcast(deployer);
        Diamond diamond = new Diamond(initDiamondCut);

        return address(diamond);
    }
}
