// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "@river-build/diamond/src/IDiamond.sol";

// libraries
import "forge-std/console.sol";

// helpers
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Diamond} from "@river-build/diamond/src/Diamond.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeployRiverConfig} from "contracts/scripts/deployments/facets/DeployRiverConfig.s.sol";
import {DeployNodeRegistry} from "contracts/scripts/deployments/facets/DeployNodeRegistry.s.sol";
import {DeployStreamRegistry} from "contracts/scripts/deployments/facets/DeployStreamRegistry.s.sol";
import {DeployOperatorRegistry} from "contracts/scripts/deployments/facets/DeployOperatorRegistry.s.sol";

// facets
import {OperatorRegistry} from "contracts/src/river/registry/facets/operator/OperatorRegistry.sol";
import {RiverConfig} from "contracts/src/river/registry/facets/config/RiverConfig.sol";

import {MultiInit} from "@river-build/diamond/src/initializers/MultiInit.sol";

contract DeployRiverRegistry is DiamondHelper, Deployer {
  DeployDiamondCut internal cutHelper = new DeployDiamondCut();
  DeployDiamondLoupe internal loupeHelper = new DeployDiamondLoupe();
  DeployIntrospection internal introspectionHelper = new DeployIntrospection();
  DeployOwnable internal ownableHelper = new DeployOwnable();
  DeployNodeRegistry internal nodeRegistryHelper = new DeployNodeRegistry();
  DeployStreamRegistry internal streamRegistryHelper =
    new DeployStreamRegistry();
  DeployOperatorRegistry internal operatorRegistryHelper =
    new DeployOperatorRegistry();
  DeployRiverConfig internal riverConfigHelper = new DeployRiverConfig();

  // deployer
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  address internal multiInit;

  address internal diamondCut;
  address internal diamondLoupe;
  address internal introspection;
  address internal ownable;
  address internal nodeRegistry;
  address internal streamRegistry;
  address internal operatorRegistry;
  address internal riverConfig;

  address[] internal operators = new address[](1);
  address[] internal configManagers = new address[](1);

  mapping(string => address) private facetDeployments;

  constructor() {
    facetDeployments["RiverConfig"] = address(riverConfigHelper);
    facetDeployments["NodeRegistry"] = address(nodeRegistryHelper);
    facetDeployments["StreamRegistry"] = address(streamRegistryHelper);
    facetDeployments["OperatorRegistry"] = address(operatorRegistryHelper);
  }

  function versionName() public pure override returns (string memory) {
    return "riverRegistry";
  }

  function addImmutableCuts(address deployer) internal {
    multiInit = deployMultiInit.deploy(deployer);
    diamondCut = cutHelper.deploy(deployer);
    diamondLoupe = loupeHelper.deploy(deployer);
    introspection = introspectionHelper.deploy(deployer);
    ownable = ownableHelper.deploy(deployer);

    addFacet(
      cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
      diamondCut,
      cutHelper.makeInitData("")
    );
    addFacet(
      loupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
      diamondLoupe,
      loupeHelper.makeInitData("")
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
    riverConfig = riverConfigHelper.deploy(deployer);
    nodeRegistry = nodeRegistryHelper.deploy(deployer);
    streamRegistry = streamRegistryHelper.deploy(deployer);
    operatorRegistry = operatorRegistryHelper.deploy(deployer);

    operators[0] = deployer;
    configManagers[0] = deployer;

    addFacet(
      operatorRegistryHelper.makeCut(
        operatorRegistry,
        IDiamond.FacetCutAction.Add
      ),
      operatorRegistry,
      operatorRegistryHelper.makeInitData(operators)
    );
    addFacet(
      riverConfigHelper.makeCut(riverConfig, IDiamond.FacetCutAction.Add),
      riverConfig,
      riverConfigHelper.makeInitData(configManagers)
    );
    addCut(
      nodeRegistryHelper.makeCut(nodeRegistry, IDiamond.FacetCutAction.Add)
    );
    addCut(
      streamRegistryHelper.makeCut(streamRegistry, IDiamond.FacetCutAction.Add)
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

  function diamondInitParamsFromFacets(
    address deployer,
    string[] memory facets
  ) public {
    for (uint256 i = 0; i < facets.length; i++) {
      string memory facetName = facets[i];
      address facetHelperAddress = facetDeployments[facetName];
      console.log("facetName", facetName);
      console.log("facetHelperAddress", facetHelperAddress);
      if (facetHelperAddress != address(0)) {
        // deploy facet
        address facetAddress = Deployer(facetHelperAddress).deploy(deployer);
        (FacetCut memory cut, bytes memory config) = FacetHelper(
          facetHelperAddress
        ).facetInitHelper(deployer, facetAddress);
        if (config.length > 0) {
          addFacet(cut, facetAddress, config);
        } else {
          addCut(cut);
        }
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

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);

    return address(diamond);
  }
}
