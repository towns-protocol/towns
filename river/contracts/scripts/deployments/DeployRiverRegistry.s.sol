// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

// helpers
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";

import {NodeRegistryHelper} from "contracts/test/river/registry/NodeRegistryHelper.sol";
import {StreamRegistryHelper} from "contracts/test/river/registry/StreamRegistryHelper.sol";
import {OperatorRegistryHelper} from "contracts/test/river/registry/OperatorRegistryHelper.sol";

import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

// facets
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {NodeRegistry} from "contracts/src/river/registry/facets/node/NodeRegistry.sol";
import {StreamRegistry} from "contracts/src/river/registry/facets/stream/StreamRegistry.sol";
import {OperatorRegistry} from "contracts/src/river/registry/facets/operator/OperatorRegistry.sol";

import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployRiverRegistry is DiamondDeployer {
  DiamondCutHelper internal cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper internal loupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper internal introspectionHelper = new IntrospectionHelper();
  OwnableHelper internal ownableHelper = new OwnableHelper();
  NodeRegistryHelper internal nodeRegistryHelper = new NodeRegistryHelper();
  StreamRegistryHelper internal streamRegistryHelper =
    new StreamRegistryHelper();
  OperatorRegistryHelper internal operatorRegistryHelper =
    new OperatorRegistryHelper();

  address internal diamondCut;
  address internal diamondLoupe;
  address internal introspection;
  address internal ownable;
  address internal nodeRegistry;
  address internal streamRegistry;
  address internal operatorRegistry;

  address[] internal operators = new address[](1);

  function versionName() public pure override returns (string memory) {
    return "riverRegistry";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    DeployMultiInit deployMultiInit = new DeployMultiInit();
    address multiInit = deployMultiInit.deploy();
    operators[0] = deployer;

    vm.startBroadcast(deployerPK);
    diamondCut = address(new DiamondCutFacet());
    diamondLoupe = address(new DiamondLoupeFacet());
    introspection = address(new IntrospectionFacet());
    ownable = address(new OwnableFacet());
    nodeRegistry = address(new NodeRegistry());
    streamRegistry = address(new StreamRegistry());
    operatorRegistry = address(new OperatorRegistry());
    vm.stopBroadcast();

    addFacet(
      ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add),
      ownable,
      ownableHelper.makeInitData(deployer)
    );
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
      operatorRegistryHelper.makeCut(
        operatorRegistry,
        IDiamond.FacetCutAction.Add
      ),
      operatorRegistry,
      operatorRegistryHelper.makeInitData(operators)
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
}
