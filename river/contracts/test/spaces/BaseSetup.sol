// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {INodeOperator} from "contracts/src/base/registry/facets/operator/INodeOperator.sol";
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// libraries

// contracts
import {MockMessenger} from "contracts/test/mocks/MockMessenger.sol";

// deployments
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";

import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {ISpaceDelegation} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";

// deployments
import {DeploySpaceFactory} from "contracts/scripts/deployments/DeploySpaceFactory.s.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/DeployRiverBase.s.sol";
import {DeployProxyBatchDelegation} from "contracts/scripts/deployments/DeployProxyBatchDelegation.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/DeployBaseRegistry.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
 * @dev - This contract is inherited by all other test contracts, it will create one diamond contract which represent the factory contract that creates all spaces
 */
contract BaseSetup is TestUtils, SpaceHelper {
  DeployBaseRegistry internal deployBaseRegistry = new DeployBaseRegistry();
  DeploySpaceFactory internal deploySpaceFactory = new DeploySpaceFactory();
  DeployRiverBase internal deployRiverTokenBase = new DeployRiverBase();
  DeployProxyBatchDelegation internal deployProxyBatchDelegation =
    new DeployProxyBatchDelegation();

  address[] internal operators;
  address[] internal nodes;

  address internal deployer;
  address internal founder;
  address internal space;
  address internal everyoneSpace;
  address internal spaceFactory;

  address internal userEntitlement;
  address internal ruleEntitlement;
  address internal spaceOwner;

  address internal baseRegistry;
  address internal riverToken;
  address internal bridge;
  address internal association;
  address internal vault;

  address internal mainnetProxyDelegation;
  address internal claimers;
  address internal mainnetRiverToken;

  address internal pricingModule;
  address internal fixedPricingModule;

  IEntitlementChecker internal entitlementChecker;
  IImplementationRegistry internal implementationRegistry;
  IWalletLink internal walletLink;
  INodeOperator internal nodeOperator;

  MockMessenger internal messenger;

  // @notice - This function is called before each test function
  // @dev - It will create a new diamond contract and set the spaceFactory variable to the address of the "diamond" variable
  function setUp() public virtual {
    deployer = getDeployer();

    operators = _createAccounts(10);

    // Base Registry
    baseRegistry = deployBaseRegistry.deploy();
    entitlementChecker = IEntitlementChecker(baseRegistry);
    nodeOperator = INodeOperator(baseRegistry);

    // Mainnet
    messenger = MockMessenger(deployBaseRegistry.messenger());
    deployProxyBatchDelegation.setDependencies({
      mainnetDelegation_: baseRegistry,
      messenger_: address(messenger)
    });
    mainnetProxyDelegation = deployProxyBatchDelegation.deploy();
    mainnetRiverToken = deployProxyBatchDelegation.riverToken();
    vault = deployProxyBatchDelegation.vault();
    claimers = deployProxyBatchDelegation.claimers();

    // Space Factory Diamond
    spaceFactory = deploySpaceFactory.deploy();
    userEntitlement = deploySpaceFactory.userEntitlement();
    ruleEntitlement = deploySpaceFactory.ruleEntitlement();
    spaceOwner = deploySpaceFactory.spaceOwner();
    pricingModule = deploySpaceFactory.tieredLogPricing();
    fixedPricingModule = deploySpaceFactory.fixedPricing();
    walletLink = IWalletLink(spaceFactory);
    implementationRegistry = IImplementationRegistry(spaceFactory);

    // Base Registry Diamond
    riverToken = deployRiverTokenBase.deploy();
    bridge = deployRiverTokenBase.bridgeBase();

    // POST DEPLOY
    vm.startPrank(deployer);
    ISpaceOwner(spaceOwner).setFactory(spaceFactory);
    IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
    ISpaceDelegation(baseRegistry).setRiverToken(riverToken);
    ISpaceDelegation(baseRegistry).setMainnetDelegation(baseRegistry);
    IMainnetDelegation(baseRegistry).setProxyDelegation(mainnetProxyDelegation);
    MockMessenger(messenger).setXDomainMessageSender(mainnetProxyDelegation);
    vm.stopPrank();

    // create a new space
    founder = _randomAddress();

    // Create the arguments necessary for creating a space
    IArchitectBase.SpaceInfo memory spaceInfo = _createSpaceInfo(
      "BaseSetupSpace"
    );
    spaceInfo.membership.settings.pricingModule = pricingModule;

    IArchitectBase.SpaceInfo
      memory everyoneSpaceInfo = _createEveryoneSpaceInfo(
        "BaseSetupEveryoneSpace"
      );
    everyoneSpaceInfo.membership.settings.pricingModule = fixedPricingModule;

    vm.startPrank(founder);
    space = Architect(spaceFactory).createSpace(spaceInfo);
    everyoneSpace = Architect(spaceFactory).createSpace(everyoneSpaceInfo);
    vm.stopPrank();

    // _registerOperators();
    // _registerNodes();
  }

  function _registerOperators() internal {
    for (uint256 i = 0; i < operators.length; i++) {
      vm.prank(operators[i]);
      nodeOperator.registerOperator(operators[i]);
      vm.prank(deployer);
      nodeOperator.setOperatorStatus(operators[i], NodeOperatorStatus.Approved);
    }
  }

  function _registerNodes() internal {
    nodes = new address[](operators.length);

    for (uint256 i = 0; i < operators.length; i++) {
      nodes[i] = _randomAddress();
      vm.startPrank(operators[i]);
      entitlementChecker.registerNode(nodes[i]);
      vm.stopPrank();
    }
  }
}
