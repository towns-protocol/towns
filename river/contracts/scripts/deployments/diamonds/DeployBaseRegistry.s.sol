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
import {DeployRewardsDistributionV2} from "contracts/scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";
import {DeployERC721ANonTransferable} from "contracts/scripts/deployments/facets/DeployERC721ANonTransferable.s.sol";
import {DeployMockMessenger} from "contracts/scripts/deployments/facets/DeployMockMessenger.s.sol";
import {DeployEIP712Facet} from "contracts/scripts/deployments/facets/DeployEIP712Facet.s.sol";

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
  DeployRewardsDistributionV2 distributionV2Helper =
    new DeployRewardsDistributionV2();
  DeployMockMessenger messengerHelper = new DeployMockMessenger();
  DeployEIP712Facet eip712Helper = new DeployEIP712Facet();

  address multiInit;
  address diamondCut;
  address diamondLoupe;
  address introspection;
  address ownable;
  address metadata;
  address entitlementChecker;
  address operator;

  address nft;
  address eip712;
  address distribution;
  address distributionV2;
  address spaceDelegation;
  address mainnetDelegation;
  address public messenger;

  address riverToken = 0x9172852305F32819469bf38A3772f29361d7b768;

  function versionName() public pure override returns (string memory) {
    return "baseRegistry";
  }

  function setDependencies(address riverToken_) external {
    riverToken = riverToken_;
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
    distributionV2 = distributionV2Helper.deploy(deployer);
    mainnetDelegation = mainnetDelegationHelper.deploy(deployer);
    spaceDelegation = spaceDelegationHelper.deploy(deployer);
    nft = deployNFT.deploy(deployer);
    messenger = messengerHelper.deploy(deployer);
    eip712 = eip712Helper.deploy(deployer);

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
      distributionV2Helper.makeCut(distributionV2, IDiamond.FacetCutAction.Add),
      distributionV2,
      distributionV2Helper.makeInitData(riverToken, riverToken, 14 days)
    );
    addFacet(
      spaceDelegationHelper.makeCut(
        spaceDelegation,
        IDiamond.FacetCutAction.Add
      ),
      spaceDelegation,
      spaceDelegationHelper.makeInitData(riverToken)
    );
    addFacet(
      mainnetDelegationHelper.makeCut(
        mainnetDelegation,
        IDiamond.FacetCutAction.Add
      ),
      mainnetDelegation,
      mainnetDelegationHelper.makeInitData(messenger)
    );
    addFacet(
      eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
      eip712,
      eip712Helper.makeInitData("BaseRegistry", "1")
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

  function diamondInitParamsFromFacets(
    address deployer,
    string[] memory facets
  ) public {
    for (uint256 i = 0; i < facets.length; i++) {
      string memory facetName = facets[i];
      bytes32 facetNameHash = keccak256(abi.encodePacked(facetName));

      if (facetNameHash == keccak256(abi.encodePacked("MetadataFacet"))) {
        metadata = metadataHelper.deploy(deployer);
        addFacet(
          metadataHelper.makeCut(metadata, IDiamond.FacetCutAction.Add),
          metadata,
          metadataHelper.makeInitData("SpaceOperator", "")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("EntitlementChecker"))
      ) {
        entitlementChecker = checkerHelper.deploy(deployer);
        addFacet(
          checkerHelper.makeCut(
            entitlementChecker,
            IDiamond.FacetCutAction.Add
          ),
          entitlementChecker,
          checkerHelper.makeInitData("")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("NodeOperatorFacet"))
      ) {
        operator = operatorHelper.deploy(deployer);
        addFacet(
          operatorHelper.makeCut(operator, IDiamond.FacetCutAction.Add),
          operator,
          operatorHelper.makeInitData("")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("RewardsDistribution"))
      ) {
        distribution = distributionHelper.deploy(deployer);
        addFacet(
          distributionHelper.makeCut(distribution, IDiamond.FacetCutAction.Add),
          distribution,
          distributionHelper.makeInitData("")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("RewardsDistributionV2"))
      ) {
        distributionV2 = distributionV2Helper.deploy(deployer);
        addFacet(
          distributionV2Helper.makeCut(
            distributionV2,
            IDiamond.FacetCutAction.Add
          ),
          distributionV2,
          distributionV2Helper.makeInitData("")
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("MainnetDelegation"))
      ) {
        mainnetDelegation = mainnetDelegationHelper.deploy(deployer);
        messenger = messengerHelper.deploy(deployer);
        addFacet(
          mainnetDelegationHelper.makeCut(
            mainnetDelegation,
            IDiamond.FacetCutAction.Add
          ),
          mainnetDelegation,
          mainnetDelegationHelper.makeInitData(messenger)
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("SpaceDelegationFacet"))
      ) {
        spaceDelegation = spaceDelegationHelper.deploy(deployer);
        addFacet(
          spaceDelegationHelper.makeCut(
            spaceDelegation,
            IDiamond.FacetCutAction.Add
          ),
          spaceDelegation,
          spaceDelegationHelper.makeInitData(riverToken)
        );
      } else if (
        facetNameHash == keccak256(abi.encodePacked("ERC721ANonTransferable"))
      ) {
        nft = deployNFT.deploy(deployer);
        addFacet(
          deployNFT.makeCut(nft, IDiamond.FacetCutAction.Add),
          nft,
          deployNFT.makeInitData("Operator", "OPR")
        );
      } else if (facetNameHash == keccak256(abi.encodePacked("EIP712Facet"))) {
        eip712 = eip712Helper.deploy(deployer);
        addFacet(
          eip712Helper.makeCut(eip712, IDiamond.FacetCutAction.Add),
          eip712,
          eip712Helper.makeInitData("BaseRegistry", "1")
        );
      }
    }
  }

  function __deploy(address deployer) public override returns (address) {
    addImmutableCuts(deployer);

    Diamond.InitParams memory initDiamondCut = diamondInitParams(deployer);

    vm.broadcast(deployer);
    Diamond diamond = new Diamond(initDiamondCut);
    return address(diamond);
  }
}
