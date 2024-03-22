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
import {NodeOperatorHelper} from "contracts/test/base/registry/NodeOperatorHelper.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// facets
import {ERC721ANonTransferable} from "contracts/src/diamond/facets/token/ERC721A/ERC721ANonTransferable.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/DeployMainnetDelegation.s.sol";
import {DeploySpaceOwner} from "contracts/scripts/deployments/DeploySpaceOwner.s.sol";

contract DeployBaseRegistry is DiamondDeployer {
  DiamondCutHelper cutHelper = new DiamondCutHelper();
  DiamondLoupeHelper loupeHelper = new DiamondLoupeHelper();
  OwnableHelper ownableHelper = new OwnableHelper();
  NodeOperatorHelper operatorHelper = new NodeOperatorHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();
  IntrospectionHelper introspectionHelper = new IntrospectionHelper();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut deployDiamondCut = new DeployDiamondCut();
  DeployDiamondLoupe deployDiamondLoupe = new DeployDiamondLoupe();
  DeployIntrospection deployIntrospection = new DeployIntrospection();
  DeployMainnetDelegation deployMainnetDelegation =
    new DeployMainnetDelegation();
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();

  function versionName() public pure override returns (string memory) {
    return "baseRegistry";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address multiInit = deployMultiInit.deploy();
    address diamondCut = deployDiamondCut.deploy();
    address diamondLoupe = deployDiamondLoupe.deploy();
    address introspection = deployIntrospection.deploy();

    vm.startBroadcast(deployerPK);
    address ownable = address(new OwnableFacet());
    address nft = address(new ERC721ANonTransferable());
    address operator = address(new NodeOperatorFacet());
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
      erc721aHelper.makeCut(nft, IDiamond.FacetCutAction.Add),
      nft,
      erc721aHelper.makeInitData("Operator", "OPR")
    );
    addFacet(
      operatorHelper.makeCut(operator, IDiamond.FacetCutAction.Add),
      operator,
      operatorHelper.makeInitData("")
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
}
