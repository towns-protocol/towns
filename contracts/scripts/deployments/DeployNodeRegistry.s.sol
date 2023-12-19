// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// facets
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

import {AccessControlListFacet} from "contracts/src/node-network/acl/AccessControlListFacet.sol";
import {NodeRegistryFacet} from "contracts/src/node-network/registry/NodeRegistryFacet.sol";
import {ServiceStatusFacet} from "contracts/src/node-network/service-status/ServiceStatusFacet.sol";

// helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";

import {AccessControlListHelper} from "contracts/test/node-network/acl/AccessControlListSetup.sol";
import {NodeRegistryHelper} from "contracts/test/node-network/registry/NodeRegistrySetup.sol";
import {ServiceStatusHelper} from "contracts/test/node-network/service-status/ServiceStatusSetup.sol";

// utils
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployNodeRegistry is Deployer {
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  OwnableHelper ownableHelper = new OwnableHelper();

  AccessControlListHelper accessContorlListHelper =
    new AccessControlListHelper();
  NodeRegistryHelper registryHelper = new NodeRegistryHelper();
  ServiceStatusHelper serviceHelper = new ServiceStatusHelper();

  uint256 facetCount = 6;
  address[] addresses = new address[](3);
  bytes[] datas = new bytes[](3);

  function versionName() public pure override returns (string memory) {
    return "NodeRegistry";
  }

  function __deploy(
    uint256 deployerPK,
    address deployer
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    address diamondCut = address(new DiamondCutFacet());
    address diamondLoupe = address(new DiamondLoupeFacet());
    address ownable = address(new OwnableFacet());

    address accessControlList = address(new AccessControlListFacet());
    address registry = address(new NodeRegistryFacet());
    address service = address(new ServiceStatusFacet());

    address multiInit = address(new MultiInit());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](facetCount);
    uint index;

    cuts[index++] = cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add);
    cuts[index++] = loupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add);
    cuts[index++] = accessContorlListHelper.makeCut(
      accessControlList,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = registryHelper.makeCut(
      registry,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = serviceHelper.makeCut(service, IDiamond.FacetCutAction.Add);

    index = 0;

    addresses[index++] = diamondCut;
    addresses[index++] = diamondLoupe;
    addresses[index++] = ownable;

    index = 0;

    datas[index++] = cutHelper.makeInitData("");
    datas[index++] = loupeHelper.makeInitData("");
    datas[index++] = ownableHelper.makeInitData(abi.encode(address(deployer)));

    vm.startBroadcast(deployerPK);
    address nodeRegistry = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: multiInit,
          initData: abi.encodeWithSelector(
            MultiInit.multiInit.selector,
            addresses,
            datas
          )
        })
      )
    );
    vm.stopBroadcast();

    return nodeRegistry;
  }
}
