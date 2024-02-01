// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// facets
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {NodeRegistryFacet} from "contracts/src/node/registry/NodeRegistryFacet.sol";
import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";
import {NodeStatusFacet} from "contracts/src/node/status/NodeStatusFacet.sol";
import {AccessControlListFacet} from "contracts/src/node/acl/AccessControlListFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

// helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {NodeRegistryHelper} from "contracts/test/node/registry/NodeRegistryHelper.sol";
import {NodeOperatorHelper} from "contracts/test/node/operator/NodeOperatorHelper.sol";
import {NodeStatusHelper} from "contracts/test/node/status/NodeStatusHelper.sol";
import {AccessControlListHelper} from "contracts/test/node/acl/AccessControlListHelper.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";

// utils
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

contract DeployNodeRegistry is DiamondDeployer {
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  OwnableHelper ownableHelper = new OwnableHelper();

  NodeRegistryHelper registryHelper = new NodeRegistryHelper();
  NodeOperatorHelper operatorHelper = new NodeOperatorHelper();
  NodeStatusHelper statusHelper = new NodeStatusHelper();
  AccessControlListHelper aclHelper = new AccessControlListHelper();

  uint256 facetCount = 7;
  address[] initAddresses = new address[](facetCount);
  bytes[] initDatas = new bytes[](facetCount);

  function versionName() public pure override returns (string memory) {
    return "nodeRegistry";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    DeployMultiInit deployMultiInit = new DeployMultiInit();
    address multiInit = deployMultiInit.deploy();

    vm.startBroadcast(deployerPK);
    address diamondCut = address(new DiamondCutFacet());
    address diamondLoupe = address(new DiamondLoupeFacet());
    address ownable = address(new OwnableFacet());

    address registry = address(new NodeRegistryFacet());
    address operator = address(new NodeOperatorFacet());
    address status = address(new NodeStatusFacet());
    address accessControlList = address(new AccessControlListFacet());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](facetCount);
    uint index;

    cuts[index++] = cutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add);
    cuts[index++] = loupeHelper.makeCut(
      diamondLoupe,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = ownableHelper.makeCut(ownable, IDiamond.FacetCutAction.Add);

    cuts[index++] = registryHelper.makeCut(
      registry,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = operatorHelper.makeCut(
      operator,
      IDiamond.FacetCutAction.Add
    );
    cuts[index++] = statusHelper.makeCut(status, IDiamond.FacetCutAction.Add);
    cuts[index++] = aclHelper.makeCut(
      accessControlList,
      IDiamond.FacetCutAction.Add
    );

    index = 0;

    initAddresses[index++] = diamondCut;
    initAddresses[index++] = diamondLoupe;
    initAddresses[index++] = ownable;
    initAddresses[index++] = registry;
    initAddresses[index++] = operator;
    initAddresses[index++] = status;
    initAddresses[index++] = accessControlList;

    index = 0;

    initDatas[index++] = cutHelper.makeInitData("");
    initDatas[index++] = loupeHelper.makeInitData("");
    initDatas[index++] = ownableHelper.makeInitData(deployer);

    initDatas[index++] = registryHelper.makeInitData("");
    initDatas[index++] = operatorHelper.makeInitData("");
    initDatas[index++] = statusHelper.makeInitData("");
    initDatas[index++] = aclHelper.makeInitData("");

    return
      Diamond.InitParams({
        baseFacets: cuts,
        init: multiInit,
        initData: abi.encodeWithSelector(
          MultiInit.multiInit.selector,
          initAddresses,
          initDatas
        )
      });
  }
}
