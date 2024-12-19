// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {IDiamond, Diamond} from "@river-build/diamond/src/Diamond.sol";
import {DiamondHelper} from "@river-build/diamond/scripts/common/helpers/DiamondHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";

// utils
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {MultiInit} from "@river-build/diamond/src/initializers/MultiInit.sol";

contract DeployDiamond is DiamondHelper, Deployer {
  DeployMultiInit private multiInitHelper = new DeployMultiInit();
  DeployDiamondCut private diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe private diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection private introspectionHelper = new DeployIntrospection();
  DeployOwnable private ownableHelper = new DeployOwnable();

  function versionName() public pure override returns (string memory) {
    return "diamond";
  }

  function diamondInitParams(
    address deployer
  ) internal returns (Diamond.InitParams memory) {
    address multiInit = multiInitHelper.deploy(deployer);
    address diamondCut = diamondCutHelper.deploy(deployer);
    address diamondLoupe = diamondLoupeHelper.deploy(deployer);
    address introspection = introspectionHelper.deploy(deployer);
    address ownable = ownableHelper.deploy(deployer);

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
    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    vm.startBroadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);
    vm.stopBroadcast();

    return address(diamond);
  }
}
