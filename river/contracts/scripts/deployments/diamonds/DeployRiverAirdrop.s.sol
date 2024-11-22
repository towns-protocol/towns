// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

// deployers
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDropFacet} from "contracts/scripts/deployments/facets/DeployDropFacet.s.sol";
import {DeployRiverPoints} from "contracts/scripts/deployments/facets/DeployRiverPoints.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";

contract DeployRiverAirdrop is DiamondHelper, Deployer {
  address internal BASE_REGISTRY = address(0);
  address internal SPACE_FACTORY = address(0);

  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployDropFacet dropHelper = new DeployDropFacet();
  DeployRiverPoints pointsHelper = new DeployRiverPoints();
  DeployMetadata metadataHelper = new DeployMetadata();

  address multiInit;
  address diamondCut;
  address diamondLoupe;
  address introspection;
  address ownable;

  address dropFacet;
  address pointsFacet;
  address metadata;

  function versionName() public pure override returns (string memory) {
    return "riverAirdrop";
  }

  function setSpaceFactory(address spaceFactory) external {
    SPACE_FACTORY = spaceFactory;
  }

  function getSpaceFactory() internal returns (address) {
    if (SPACE_FACTORY != address(0)) {
      return SPACE_FACTORY;
    }

    return getDeployment("spaceFactory");
  }

  function setBaseRegistry(address baseRegistry) external {
    BASE_REGISTRY = baseRegistry;
  }

  function getBaseRegistry() internal returns (address) {
    if (BASE_REGISTRY != address(0)) {
      return BASE_REGISTRY;
    }

    return getDeployment("baseRegistry");
  }

  function addImmutableCuts(address deployer) internal {
    multiInit = deployMultiInit.deploy(deployer);
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

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    dropFacet = dropHelper.deploy(deployer);
    pointsFacet = pointsHelper.deploy(deployer);
    metadata = metadataHelper.deploy(deployer);

    addFacet(
      dropHelper.makeCut(dropFacet, IDiamond.FacetCutAction.Add),
      dropFacet,
      dropHelper.makeInitData(getBaseRegistry())
    );
    addFacet(
      pointsHelper.makeCut(pointsFacet, IDiamond.FacetCutAction.Add),
      pointsFacet,
      pointsHelper.makeInitData(getSpaceFactory())
    );
    addFacet(
      metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
      metadata,
      metadataHelper.makeInitData(bytes32("RiverAirdrop"), "")
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

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);
    return address(diamond);
  }
}
