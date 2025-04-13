// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interface
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondInitHelper} from "./IDiamondInitHelper.sol";

// libraries
import {DeployDiamondCut} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "@towns-protocol/diamond/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployEIP712Facet} from "@towns-protocol/diamond/scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployIntrospection} from "@towns-protocol/diamond/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "@towns-protocol/diamond/scripts/deployments/facets/DeployOwnable.s.sol";
import {LibString} from "solady/utils/LibString.sol";
import {DeploySpaceOwnerFacet} from "../facets/DeploySpaceOwnerFacet.s.sol";
import {DeployGuardianFacet} from "../facets/DeployGuardianFacet.s.sol";
import {DeployMetadata} from "../facets/DeployMetadata.s.sol";

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "../../common/DeployFacet.s.sol";
import {Deployer} from "../../common/Deployer.s.sol";

contract DeploySpaceOwner is IDiamondInitHelper, DiamondHelper, Deployer {
    using LibString for string;

    DeployFacet private facetHelper = new DeployFacet();

    address multiInit;
    address diamondCut;
    address diamondLoupe;
    address introspection;
    address ownable;

    address eip712;
    address metadata;
    address spaceOwner;
    address guardian;

    function versionName() public pure override returns (string memory) {
        return "spaceOwner";
    }

    function addImmutableCuts(address deployer) internal {
        multiInit = facetHelper.deploy("MultiInit", deployer);
        diamondCut = facetHelper.deploy("DiamondCutFacet", deployer);
        diamondLoupe = facetHelper.deploy("DiamondLoupeFacet", deployer);
        introspection = facetHelper.deploy("IntrospectionFacet", deployer);
        ownable = facetHelper.deploy("OwnableFacet", deployer);

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
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        metadata = facetHelper.deploy("MetadataFacet", deployer);
        spaceOwner = facetHelper.deploy("SpaceOwner", deployer);
        guardian = facetHelper.deploy("GuardianFacet", deployer);
        eip712 = facetHelper.deploy("EIP712Facet", deployer);

        addFacet(
            DeploySpaceOwnerFacet.makeCut(spaceOwner, IDiamond.FacetCutAction.Add),
            spaceOwner,
            DeploySpaceOwnerFacet.makeInitData("Space Owner", "OWNER")
        );
        addFacet(
            DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
            eip712,
            DeployEIP712Facet.makeInitData("Space Owner", "1")
        );
        addFacet(
            DeployGuardianFacet.makeCut(guardian, IDiamond.FacetCutAction.Add),
            guardian,
            DeployGuardianFacet.makeInitData(7 days)
        );
        addFacet(
            DeployMetadata.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            DeployMetadata.makeInitData(bytes32("Space Owner"), "")
        );

        return
            Diamond.InitParams({
                baseFacets: baseFacets(),
                init: multiInit,
                initData: abi.encodeCall(MultiInit.multiInit, (_initAddresses, _initDatas))
            });
    }

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i; i < facets.length; ++i) {
            string memory facetName = facets[i];
            if (facetName.eq("MetadataFacet")) {
                metadata = facetHelper.deploy("MetadataFacet", deployer);
                addFacet(
                    DeployMetadata.makeCut(metadata, IDiamond.FacetCutAction.Add),
                    metadata,
                    DeployMetadata.makeInitData(bytes32("Space Owner"), "")
                );
            } else if (facetName.eq("SpaceOwner")) {
                spaceOwner = facetHelper.deploy("SpaceOwner", deployer);
                addFacet(
                    DeploySpaceOwnerFacet.makeCut(spaceOwner, IDiamond.FacetCutAction.Add),
                    spaceOwner,
                    DeploySpaceOwnerFacet.makeInitData("Space Owner", "OWNER")
                );
            } else if (facetName.eq("EIP712Facet")) {
                eip712 = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
                    eip712,
                    DeployEIP712Facet.makeInitData("Space Owner", "1")
                );
            } else if (facetName.eq("GuardianFacet")) {
                guardian = facetHelper.deploy("GuardianFacet", deployer);
                addFacet(
                    DeployGuardianFacet.makeCut(guardian, IDiamond.FacetCutAction.Add),
                    guardian,
                    DeployGuardianFacet.makeInitData(7 days)
                );
            }
        }
    }

    function diamondInitHelper(
        address deployer,
        string[] memory facetNames
    ) external override returns (FacetCut[] memory) {
        diamondInitParamsFromFacets(deployer, facetNames);
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
