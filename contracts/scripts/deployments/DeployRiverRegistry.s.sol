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
import {RiverRegistryHelper} from "contracts/test/river/registry/RiverRegistryHelper.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";

// facets
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {RiverRegistry} from "contracts/src/river/registry/RiverRegistry.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployRiverRegistry is DiamondDeployer {
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  RiverRegistryHelper registryHelper = new RiverRegistryHelper();

  address[] initialOperators;

  function versionName() public pure override returns (string memory) {
    return "riverRegistry";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    DeployMultiInit deployMultiInit = new DeployMultiInit();
    address multiInit = deployMultiInit.deploy();

    initialOperators.push(deployer);
    _addInitialOperators();

    vm.startBroadcast(deployerPK);
    address diamondCut = address(new DiamondCutFacet());
    address diamondLoupe = address(new DiamondLoupeFacet());
    address introspection = address(new IntrospectionFacet());
    address ownable = address(new OwnableFacet());
    address registry = address(new RiverRegistry());
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
      registryHelper.makeCut(registry, IDiamond.FacetCutAction.Add),
      registry,
      registryHelper.makeInitData(initialOperators)
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

  function _addInitialOperators() internal {
    initialOperators.push(0xBF2Fe1D28887A0000A1541291c895a26bD7B1DdD);
    initialOperators.push(0x43EaCe8E799497f8206E579f7CCd1EC41770d099);
    initialOperators.push(0x4E9baef70f7505fda609967870b8b489AF294796);
    initialOperators.push(0xae2Ef76C62C199BC49bB38DB99B29726bD8A8e53);
    initialOperators.push(0xC4f042CD5aeF82DB8C089AD0CC4DD7d26B2684cB);
    initialOperators.push(0x9BB3b35BBF3FA8030cCdb31030CF78039A0d0D9b);
    initialOperators.push(0x582c64BA11bf70E0BaC39988Cd3Bf0b8f40BDEc4);
    initialOperators.push(0x9df6e5F15ec682ca58Df6d2a831436973f98fe60);
    initialOperators.push(0xB79FaCbFC07Bff49cD2e2971305Da0DF7aCa9bF8);
    initialOperators.push(0xA278267f396a317c5Bb583f47F7f2792Bc00D3b3);
  }
}
