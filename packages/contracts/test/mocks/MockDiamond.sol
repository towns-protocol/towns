// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Diamond, IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";

import {MultiInit} from "@towns-protocol/diamond/src/initializers/MultiInit.sol";
import {DeployDiamondCut} from "scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployManagedProxy} from "scripts/deployments/facets/DeployManagedProxy.s.sol";
import {DeployOwnable} from "scripts/deployments/facets/DeployOwnable.s.sol";

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

        address ownable = ownableHelper.deploy(owner);
        address diamondCut = diamondCutHelper.deploy(owner);
        address diamondLoupe = diamondLoupeHelper.deploy(owner);
        address introspection = introspectionHelper.deploy(owner);
        address managedProxy = managedProxyHelper.deploy(owner);

        cuts.push(diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add));
        cuts.push(diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add));
        cuts.push(introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add));
        cuts.push(ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add));
        cuts.push(managedProxyHelper.makeCut(managedProxy, IDiamond.FacetCutAction.Add));

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
