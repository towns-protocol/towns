// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// utils
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";

import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// facets
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";
import {MainnetDelegationHelper} from "contracts/test/tokens/delegation/MainnetDelegationHelper.sol";

contract DeployMainnetDelegation is DiamondDeployer {
  DeployDiamondCut cutHelper = new DeployDiamondCut();
  DeployDiamondLoupe loupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployMultiInit deployMultiInit = new DeployMultiInit();

  MainnetDelegationHelper delegationHelper = new MainnetDelegationHelper();

  function versionName() public pure override returns (string memory) {
    return "mainnetDelegation";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address diamondCut = cutHelper.deploy();
    address diamondLoupe = loupeHelper.deploy();
    address ownable = ownableHelper.deploy();
    address introspection = introspectionHelper.deploy();
    address multiInit = deployMultiInit.deploy();

    vm.startBroadcast(deployerPK);
    address delegation = address(new MainnetDelegation());
    vm.stopBroadcast();

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
      delegationHelper.makeCut(delegation, IDiamond.FacetCutAction.Add),
      delegation,
      delegationHelper.makeInitData("")
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
