// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interface
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

// libraries

// contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";

// facets
import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {GuardianFacet} from "contracts/src/spaces/facets/guardian/GuardianFacet.sol";

// helpers
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";

import {GuardianHelper} from "contracts/test/spaces/guardian/GuardianSetup.sol";
import {SpaceOwnerHelper} from "contracts/test/spaces/owner/SpaceOwnerHelper.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {VotesHelper} from "contracts/test/governance/votes/VotesSetup.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

contract DeploySpaceOwner is DiamondDeployer {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployMultiInit multiInitHelper = new DeployMultiInit();

  GuardianHelper guardianHelper = new GuardianHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  VotesHelper votesHelper = new VotesHelper();
  SpaceOwnerHelper spaceOwnerHelper = new SpaceOwnerHelper();

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
    address multiInit = multiInitHelper.deploy();

    vm.startBroadcast(deployer);
    address spaceOwner = address(new SpaceOwner());
    address guardian = address(new GuardianFacet());
    vm.stopBroadcast();

    spaceOwnerHelper.addSelectors(erc721aHelper.selectors());
    spaceOwnerHelper.addSelectors(votesHelper.selectors());

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
