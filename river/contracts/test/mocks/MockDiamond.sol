// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployManagedProxy} from "contracts/scripts/deployments/facets/DeployManagedProxy.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// debuggging

/// @title MockDiamondHelper
/// @notice Used to create a diamond with all the facets we need for testing
contract MockDiamondHelper {
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployManagedProxy managedProxyHelper = new DeployManagedProxy();

  Diamond.FacetCut[] cuts;
  address[] addresses;
  bytes[] payloads;

  function createDiamond(address owner) public returns (Diamond) {
    MultiInit multiInit = new MultiInit();

    address ownable = ownableHelper.deploy();
    address diamondCut = diamondCutHelper.deploy();
    address diamondLoupe = diamondLoupeHelper.deploy();
    address introspection = introspectionHelper.deploy();
    address managedProxy = managedProxyHelper.deploy();

    cuts.push(
      diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add)
    );
    cuts.push(
      diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add)
    );
    cuts.push(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add)
    );
    cuts.push(ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add));
    cuts.push(
      managedProxyHelper.makeCut(managedProxy, IDiamond.FacetCutAction.Add)
    );

    addresses.push(diamondCut);
    addresses.push(diamondLoupe);
    addresses.push(introspection);
    addresses.push(ownable);
    addresses.push(managedProxy);

    payloads.push(diamondCutHelper.makeInitData(""));
    payloads.push(diamondLoupeHelper.makeInitData(""));
    payloads.push(introspectionHelper.makeInitData(""));
    payloads.push(ownableHelper.makeInitData(owner));
    payloads.push(managedProxyHelper.makeInitData(""));

    return
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: address(multiInit),
          initData: abi.encodeWithSelector(
            multiInit.multiInit.selector,
            addresses,
            payloads
          )
        })
      );
  }
}
