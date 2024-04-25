// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// helpers
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// facets
import {ERC721ANonTransferable} from "contracts/src/diamond/facets/token/ERC721A/ERC721ANonTransferable.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/DeployMainnetDelegation.s.sol";
import {DeployEntitlementChecker} from "contracts/scripts/deployments/facets/DeployEntitlementChecker.s.sol";
import {DeployNodeOperator} from "contracts/scripts/deployments/facets/DeployNodeOperator.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";

contract DeployBaseRegistry is DiamondDeployer {
  ERC721AHelper erc721aHelper = new ERC721AHelper();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut cutHelper = new DeployDiamondCut();
  DeployDiamondLoupe loupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployMainnetDelegation deployMainnetDelegation =
    new DeployMainnetDelegation();
  DeployEntitlementChecker checkerHelper = new DeployEntitlementChecker();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployNodeOperator operatorHelper = new DeployNodeOperator();

  function versionName() public pure override returns (string memory) {
    return "baseRegistry";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    address multiInit = deployMultiInit.deploy();
    address diamondCut = cutHelper.deploy();
    address diamondLoupe = loupeHelper.deploy();
    address introspection = introspectionHelper.deploy();
    address ownable = ownableHelper.deploy();
    address metadata = metadataHelper.deploy();
    address entitlementChecker = checkerHelper.deploy();
    address operator = operatorHelper.deploy();

    vm.startBroadcast(deployerPK);
    address nft = address(new ERC721ANonTransferable());
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
    addFacet(
      metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
      metadata,
      metadataHelper.makeInitData("SpaceOperator", "")
    );
    addFacet(
      checkerHelper.makeCut(entitlementChecker, IDiamond.FacetCutAction.Add),
      entitlementChecker,
      checkerHelper.makeInitData("")
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
