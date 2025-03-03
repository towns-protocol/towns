// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "@river-build/diamond/src/IDiamond.sol";

// libraries
import {Implementations} from "contracts/src/spaces/facets/Implementations.sol";

//contracts
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Diamond} from "@river-build/diamond/src/Diamond.sol";

// facets
import {MultiInit} from "@river-build/diamond/src/initializers/MultiInit.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployAppInstaller} from "contracts/scripts/deployments/facets/DeployAppInstaller.s.sol";
import {DeployAppRegistry} from "contracts/scripts/deployments/facets/DeployAppRegistry.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";

contract DeployAppStore is DiamondHelper, Deployer {
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployAppInstaller appInstallerHelper = new DeployAppInstaller();
  DeployAppRegistry appRegistryHelper = new DeployAppRegistry();
  DeployMetadata metadataHelper = new DeployMetadata();

  address multiInit;
  address diamondCut;
  address diamondLoupe;
  address introspection;
  address ownable;
  address appInstaller;
  address appRegistry;
  address metadata;

  function versionName() public pure override returns (string memory) {
    return "appStore";
  }

  function addImmutableCuts(address deployer) internal {
    multiInit = deployMultiInit.deploy(deployer);
    diamondCut = diamondCutHelper.deploy(deployer);
    diamondLoupe = diamondLoupeHelper.deploy(deployer);
    introspection = introspectionHelper.deploy(deployer);
    ownable = ownableHelper.deploy(deployer);
    metadata = metadataHelper.deploy(deployer);
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
    addFacet(
      metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
      metadata,
      metadataHelper.makeInitData(Implementations.APP_REGISTRY, "")
    );
  }

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    appInstaller = appInstallerHelper.deploy(deployer);
    appRegistry = appRegistryHelper.deploy(deployer);

    addFacet(
      appInstallerHelper.makeCut(appInstaller, IDiamond.FacetCutAction.Add),
      appInstaller,
      appInstallerHelper.makeInitData("")
    );
    addFacet(
      appRegistryHelper.makeCut(appRegistry, IDiamond.FacetCutAction.Add),
      appRegistry,
      appRegistryHelper.makeInitData("")
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
