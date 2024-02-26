// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// helpers
import {DiamondCutHelper} from "contracts/test/diamond/cut/DiamondCutSetup.sol";
import {DiamondLoupeHelper} from "contracts/test/diamond/loupe/DiamondLoupeSetup.sol";
import {NodeOperatorHelper} from "contracts/test/node/operator/NodeOperatorHelper.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// facets
import {DiamondCutFacet} from "contracts/src/diamond/facets/cut/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "contracts/src/diamond/facets/loupe/DiamondLoupeFacet.sol";
import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/DeployMainnetDelegation.s.sol";
import {DeployTownOwner} from "contracts/scripts/deployments/DeployTownOwner.s.sol";

contract DeployNodeOperator is DiamondDeployer {
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  NodeOperatorHelper operatorHelper = new NodeOperatorHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployMainnetDelegation deployMainnetDelegation =
    new DeployMainnetDelegation();
  DeployTownOwner deployTownOwner = new DeployTownOwner();

  uint256 public constant stakeRequirement = 1 ether; // 1 river token

  function versionName() public pure override returns (string memory) {
    return "nodeOperator";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address multiInit = deployMultiInit.deploy();

    vm.startBroadcast(deployerPK);
    address diamondCut = address(new DiamondCutFacet());
    address diamondLoupe = address(new DiamondLoupeFacet());
    address ownable = address(new OwnableFacet());
    address operator = address(new NodeOperatorFacet());
    address introspection = address(new IntrospectionFacet());
    vm.stopBroadcast();

    operatorHelper.addSelectors(erc721aHelper.selectors());

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
      operatorHelper.makeCut(operator, IDiamond.FacetCutAction.Add),
      operator,
      operatorHelper.makeInitData(stakeRequirement)
    );
    addFacet(
      introspectionHelper.makeCut(introspection, IDiamond.FacetCutAction.Add),
      introspection,
      introspectionHelper.makeInitData("")
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

  function postDeploy(address deployer, address nodeOperator) public override {
    address townOwner = deployTownOwner.deploy();
    address mainnetDelegation = deployMainnetDelegation.deploy();

    vm.startBroadcast(deployer);
    NodeOperatorFacet(nodeOperator).setSpaceOwnerRegistry(townOwner);
    NodeOperatorFacet(nodeOperator).setMainnetDelegation(mainnetDelegation);
    vm.stopBroadcast();
  }
}
