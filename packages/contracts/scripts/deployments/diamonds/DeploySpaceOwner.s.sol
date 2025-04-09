// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interface
import {Diamond, IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

// libraries

// contracts
import {Deployer} from "scripts/common/Deployer.s.sol";
import {DiamondHelper} from "test/diamond/Diamond.t.sol";

// helpers
import {DeployDiamondCut} from "scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployEIP712Facet} from "scripts/deployments/facets/DeployEIP712Facet.s.sol";
import {DeployGuardianFacet} from "scripts/deployments/facets/DeployGuardianFacet.s.sol";
import {DeployIntrospection} from "scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMetadata} from "scripts/deployments/facets/DeployMetadata.s.sol";
import {DeployOwnable} from "scripts/deployments/facets/DeployOwnable.s.sol";
import {DeploySpaceOwnerFacet} from "scripts/deployments/facets/DeploySpaceOwnerFacet.s.sol";
import {DeployMultiInit, MultiInit} from "scripts/deployments/utils/DeployMultiInit.s.sol";

contract DeploySpaceOwner is DiamondHelper, Deployer {
    DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
    DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
    DeployOwnable ownableHelper = new DeployOwnable();
    DeployEIP712Facet eip712Helper = new DeployEIP712Facet();
    DeployIntrospection introspectionHelper = new DeployIntrospection();
    DeploySpaceOwnerFacet spaceOwnerHelper = new DeploySpaceOwnerFacet();
    DeployMetadata metadataHelper = new DeployMetadata();
    DeployGuardianFacet guardianHelper = new DeployGuardianFacet();
    DeployMultiInit multiInitHelper = new DeployMultiInit();

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
        multiInit = multiInitHelper.deploy(deployer);

        diamondCut = diamondCutHelper.deploy(deployer);
        diamondLoupe = diamondLoupeHelper.deploy(deployer);
        introspection = introspectionHelper.deploy(deployer);
        ownable = ownableHelper.deploy(deployer);

        addFacet(
            diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
            diamondCut,
            diamondCutHelper.makeInitData("")
        );
        addFacet(
            diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
            diamondLoupe,
            diamondLoupeHelper.makeInitData("")
        );
        addFacet(
            introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
            introspection,
            introspectionHelper.makeInitData("")
        );
        addFacet(
            ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
            ownable,
            ownableHelper.makeInitData(deployer)
        );
    }

    function diamondInitParams(address deployer) public returns (Diamond.InitParams memory) {
        metadata = metadataHelper.deploy(deployer);
        spaceOwner = spaceOwnerHelper.deploy(deployer);
        guardian = guardianHelper.deploy(deployer);
        eip712 = eip712Helper.deploy(deployer);

        addFacet(
            spaceOwnerHelper.makeCut(spaceOwner, IDiamond.FacetCutAction.Add),
            spaceOwner,
            spaceOwnerHelper.makeInitData("Space Owner", "OWNER")
        );
        addFacet(
            eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
            eip712,
            eip712Helper.makeInitData("Space Owner", "1")
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
                eip712 = eip712Helper.deploy(deployer);
                addFacet(
                    eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
                    eip712,
                    eip712Helper.makeInitData("Space Owner", "1")
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
