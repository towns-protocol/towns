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

// contracts
import {Diamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DiamondHelper} from "@towns-protocol/diamond/scripts/common/helpers/DiamondHelper.s.sol";

// deployers
import {DeployFacet} from "contracts/scripts/common/DeployFacet.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {DeployGuardianFacet} from "contracts/scripts/deployments/facets/DeployGuardianFacet.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeploySpaceOwnerFacet} from "contracts/scripts/deployments/facets/DeploySpaceOwnerFacet.s.sol";

contract DeploySpaceOwner is IDiamondInitHelper, DiamondHelper, Deployer {
    DeployFacet private facetHelper = new DeployFacet();
    DeployMetadata metadataHelper = new DeployMetadata();
    DeploySpaceOwnerFacet spaceOwnerHelper = new DeploySpaceOwnerFacet();
    DeployGuardianFacet guardianHelper = new DeployGuardianFacet();

    address multiInit;
    address diamondCut;
    address diamondLoupe;
    address eip712;
    address introspection;
    address ownable;

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
        metadata = metadataHelper.deploy(deployer);
        spaceOwner = spaceOwnerHelper.deploy(deployer);
        guardian = guardianHelper.deploy(deployer);
        eip712 = facetHelper.deploy("EIP712Facet", deployer);

        addFacet(
            spaceOwnerHelper.makeCut(spaceOwner, IDiamond.FacetCutAction.Add),
            spaceOwner,
            spaceOwnerHelper.makeInitData("Space Owner", "OWNER")
        );
        addFacet(
            DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
            eip712,
            DeployEIP712Facet.makeInitData("Space Owner", "1")
        );
        addFacet(
            guardianHelper.makeCut(guardian, IDiamond.FacetCutAction.Add),
            guardian,
            guardianHelper.makeInitData(7 days)
        );
        addFacet(
            metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
            metadata,
            metadataHelper.makeInitData(bytes32("Space Owner"), "")
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

    function diamondInitParamsFromFacets(address deployer, string[] memory facets) public {
        for (uint256 i = 0; i < facets.length; i++) {
            bytes32 facetNameHash = keccak256(abi.encodePacked(facets[i]));

            if (facetNameHash == keccak256(abi.encodePacked("MetadataFacet"))) {
                metadata = metadataHelper.deploy(deployer);
                addFacet(
                    metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
                    metadata,
                    metadataHelper.makeInitData(bytes32("Space Owner"), "")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("SpaceOwner"))) {
                spaceOwner = spaceOwnerHelper.deploy(deployer);
                addFacet(
                    spaceOwnerHelper.makeCut(spaceOwner, IDiamond.FacetCutAction.Add),
                    spaceOwner,
                    spaceOwnerHelper.makeInitData("Space Owner", "OWNER")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("EIP712Facet"))) {
                eip712 = facetHelper.deploy("EIP712Facet", deployer);
                addFacet(
                    DeployEIP712Facet.makeCut(eip712, IDiamond.FacetCutAction.Add),
                    eip712,
                    DeployEIP712Facet.makeInitData("Space Owner", "1")
                );
            } else if (facetNameHash == keccak256(abi.encodePacked("GuardianFacet"))) {
                guardian = guardianHelper.deploy(deployer);
                addFacet(
                    guardianHelper.makeCut(guardian, IDiamond.FacetCutAction.Add),
                    guardian,
                    guardianHelper.makeInitData(7 days)
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
