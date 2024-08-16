// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//contracts
import {DiamondHelper} from "contracts/test/diamond/Diamond.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Diamond} from "contracts/src/diamond/Diamond.sol";

// helpers
import {OwnableHelper} from "contracts/test/diamond/ownable/OwnableSetup.sol";
import {IntrospectionHelper} from "contracts/test/diamond/introspection/IntrospectionSetup.sol";

// facets
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";

// deployers
import {DeployMultiInit} from "contracts/scripts/deployments/utils/DeployMultiInit.s.sol";
import {DeployDiamondCut} from "contracts/scripts/deployments/facets/DeployDiamondCut.s.sol";
import {DeployDiamondLoupe} from "contracts/scripts/deployments/facets/DeployDiamondLoupe.s.sol";
import {DeployIntrospection} from "contracts/scripts/deployments/facets/DeployIntrospection.s.sol";
import {DeployOwnable} from "contracts/scripts/deployments/facets/DeployOwnable.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/facets/DeployMainnetDelegation.s.sol";
import {DeployEntitlementChecker} from "contracts/scripts/deployments/facets/DeployEntitlementChecker.s.sol";
import {DeployNodeOperator} from "contracts/scripts/deployments/facets/DeployNodeOperator.s.sol";
import {DeployMetadata} from "contracts/scripts/deployments/facets/DeployMetadata.s.sol";
import {DeploySpaceDelegation} from "contracts/scripts/deployments/facets/DeploySpaceDelegation.s.sol";
import {DeployRewardsDistribution} from "contracts/scripts/deployments/facets/DeployRewardsDistribution.s.sol";
import {DeployERC721ANonTransferable} from "contracts/scripts/deployments/facets/DeployERC721ANonTransferable.s.sol";
import {DeployMockMessenger} from "contracts/scripts/deployments/facets/DeployMockMessenger.s.sol";

contract DeployBaseRegistry is DiamondHelper, Deployer {
  DeployERC721ANonTransferable deployNFT = new DeployERC721ANonTransferable();

  // deployments
  DeployMultiInit deployMultiInit = new DeployMultiInit();
  DeployDiamondCut diamondCutHelper = new DeployDiamondCut();
  DeployDiamondLoupe diamondLoupeHelper = new DeployDiamondLoupe();
  DeployIntrospection introspectionHelper = new DeployIntrospection();
  DeployOwnable ownableHelper = new DeployOwnable();
  DeployMainnetDelegation mainnetDelegationHelper =
    new DeployMainnetDelegation();
  DeployEntitlementChecker checkerHelper = new DeployEntitlementChecker();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployNodeOperator operatorHelper = new DeployNodeOperator();
  DeploySpaceDelegation spaceDelegationHelper = new DeploySpaceDelegation();
  DeployRewardsDistribution distributionHelper =
    new DeployRewardsDistribution();
  DeployMockMessenger messengerHelper = new DeployMockMessenger();

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
  address public messenger;

  function versionName() public pure override returns (string memory) {
    return "baseRegistry";
  }

  function addImmutableCuts(address deployer) internal {
    multiInit = deployMultiInit.deploy(deployer);

    diamondCut = diamondCutHelper.deploy(deployer);
    diamondLoupe = diamondLoupeHelper.deploy(deployer);
    introspection = introspectionHelper.deploy(deployer);
    ownable = ownableHelper.deploy(deployer);

    addFacet(
      diamondCutHelper.makeCut(diamondCut, IDiamond.FacetCutAction.Add),
      diamondCut,
      diamondCutHelper.makeInitData("")
    );
    addFacet(
      diamondLoupeHelper.makeCut(diamondLoupe, IDiamond.FacetCutAction.Add),
      diamondLoupe,
      diamondLoupeHelper.makeInitData("")
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
  }

  function diamondInitParams(
    address deployer
  ) public returns (Diamond.InitParams memory) {
    metadata = metadataHelper.deploy(deployer);
    entitlementChecker = checkerHelper.deploy(deployer);
    operator = operatorHelper.deploy(deployer);
    distribution = distributionHelper.deploy(deployer);
    mainnetDelegation = mainnetDelegationHelper.deploy(deployer);
    spaceDelegation = spaceDelegationHelper.deploy(deployer);
    nft = deployNFT.deploy(deployer);
    messenger = messengerHelper.deploy(deployer);

    addFacet(
      deployNFT.makeCut(nft, IDiamond.FacetCutAction.Add),
      nft,
      deployNFT.makeInitData("Operator", "OPR")
    );
    addFacet(
      operatorHelper.makeCut(operator, IDiamond.FacetCutAction.Add),
      operator,
      operatorHelper.makeInitData("")
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
    // New facets
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
      spaceDelegationHelper.makeInitData(
        0x9172852305F32819469bf38A3772f29361d7b768
      )
    );
    addFacet(
      mainnetDelegationHelper.makeCut(
        mainnetDelegation,
        IDiamond.FacetCutAction.Add
      ),
      mainnetDelegation,
      mainnetDelegationHelper.makeInitData(messenger)
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

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);
    return address(diamond);
  }
}
