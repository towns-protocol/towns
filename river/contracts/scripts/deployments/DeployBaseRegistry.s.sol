// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//contracts
import {DiamondDeployer} from "../common/DiamondDeployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// helpers
import {NodeOperatorHelper} from "contracts/test/base/registry/NodeOperatorHelper.sol";
import {RewardsDistributionHelper} from "contracts/test/base/registry/RewardsDistributionHelper.sol";
import {SpaceDelegationHelper} from "contracts/test/base/registry/SpaceDelegationHelper.sol";
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {ERC721AHelper} from "contracts/test/diamond/erc721a/ERC721ASetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";
import {MainnetDelegationHelper} from "contracts/test/tokens/delegation/MainnetDelegationHelper.sol";

// facets
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";
import {ERC721ANonTransferable} from "contracts/src/diamond/facets/token/ERC721A/ERC721ANonTransferable.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/RewardsDistribution.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/facets/DeployMainnetDelegation.s.sol";
import {DeployEntitlementChecker} from "contracts/scripts/deployments/facets/DeployEntitlementChecker.s.sol";
import {DeployNodeOperator} from "contracts/scripts/deployments/facets/DeployNodeOperator.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";

contract DeployBaseRegistry is DiamondDeployer {
  RewardsDistributionHelper distributionHelper =
    new RewardsDistributionHelper();
  SpaceDelegationHelper spaceDelegationHelper = new SpaceDelegationHelper();
  ERC721AHelper erc721aHelper = new ERC721AHelper();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut cutHelper = new DeployDiamondCut();
  DeployDiamondLoupe loupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployMainnetDelegation mainnetDelegationHelper =
    new DeployMainnetDelegation();
  DeployEntitlementChecker checkerHelper = new DeployEntitlementChecker();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployNodeOperator operatorHelper = new DeployNodeOperator();

  address multiInit;
  address diamondCut;
  address diamondLoupe;
  address introspection;
  address ownable;
  address metadata;
  address entitlementChecker;
  address operator;

  address nft;
  address distribution;
  address spaceDelegation;
  address mainnetDelegation;

  function versionName() public pure override returns (string memory) {
    return "baseRegistry";
  }

  function diamondInitParams(
    uint256 deployerPK,
    address deployer
  ) public override returns (Diamond.InitParams memory) {
    multiInit = deployMultiInit.deploy();
    diamondCut = cutHelper.deploy();
    diamondLoupe = loupeHelper.deploy();
    introspection = introspectionHelper.deploy();
    ownable = ownableHelper.deploy();
    metadata = metadataHelper.deploy();
    entitlementChecker = checkerHelper.deploy();
    operator = operatorHelper.deploy();

    vm.startBroadcast(deployerPK);
    nft = address(new ERC721ANonTransferable());
    distribution = address(new RewardsDistribution());
    spaceDelegation = address(new SpaceDelegationFacet());
    mainnetDelegation = address(new MainnetDelegation());
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
    addFacet(
      distributionHelper.makeCut(distribution, IDiamond.FacetCutAction.Add),
      distribution,
      distributionHelper.makeInitData("")
    );
    addFacet(
      spaceDelegationHelper.makeCut(
        spaceDelegation,
        IDiamond.FacetCutAction.Add
      ),
      spaceDelegation,
      spaceDelegationHelper.makeInitData("")
    );
    addFacet(
      mainnetDelegationHelper.makeCut(
        mainnetDelegation,
        IDiamond.FacetCutAction.Add
      ),
      mainnetDelegation,
      mainnetDelegationHelper.makeInitData("")
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
