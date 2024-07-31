// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interface
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

// helpers
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeploySpaceOwnerFacet} from "contracts/scripts/deployments/facets/DeploySpaceOwnerFacet.s.sol";
import {DeployGuardianFacet} from "contracts/scripts/deployments/facets/DeployGuardianFacet.s.sol";
import {DeployMultiInit, MultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeploySpaceOwner is DiamondDeployer {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeploySpaceOwnerFacet spaceOwnerHelper = new DeploySpaceOwnerFacet();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployGuardianFacet guardianHelper = new DeployGuardianFacet();
  DeployMultiInit multiInitHelper = new DeployMultiInit();

  function versionName() public pure override returns (string memory) {
    return "spaceOwner";
  }

  function diamondInitParams(
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address diamondCut = diamondCutHelper.deploy();
    address diamondLoupe = diamondLoupeHelper.deploy();
    address introspection = introspectionHelper.deploy();
    address ownable = ownableHelper.deploy();
    address metadata = metadataHelper.deploy();
    address spaceOwner = spaceOwnerHelper.deploy();
    address guardian = guardianHelper.deploy();
    address multiInit = multiInitHelper.deploy();

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
      ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
      ownable,
      ownableHelper.makeInitData(deployer)
    );

    addFacet(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
      introspection,
      introspectionHelper.makeInitData("")
    );

    addFacet(
      spaceOwnerHelper.makeCut(spaceOwner, IDiamond.FacetCutAction.Add),
      spaceOwner,
      spaceOwnerHelper.makeInitData("Space Owner", "OWNER", "1")
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
}
