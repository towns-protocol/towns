// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {IArchitectBase} from "contracts/src/spaces/facets/architect/IArchitect.sol";

// libraries

// contracts

// deployments
import {Architect} from "contracts/src/spaces/facets/architect/Architect.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {RuleEntitlement} from "contracts/src/crosschain/RuleEntitlement.sol";

import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";

// deployments
import {DeploySpaceFactory} from "contracts/scripts/deployments/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/DeployBaseRegistry.s.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/DeployRiverBase.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/DeployMainnetDelegation.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
 * @dev - This contract is inherited by all other test contracts, it will create one diamond contract which represent the factory contract that creates all spaces
 */
contract BaseSetup is TestUtils, SpaceHelper {
  DeploySpaceFactory internal deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry internal deployBaseRegistry = new DeployBaseRegistry();
  DeployRiverBase internal deployRiverToken = new DeployRiverBase();
  DeployMainnetDelegation internal deployMainnetDelegation =
    new DeployMainnetDelegation();

  address internal deployer;
  address internal founder;
  address internal space;
  address internal everyoneSpace;
  address internal spaceFactory;

  address internal userEntitlement;
  address internal ruleEntitlement;
  address internal walletLink;
  address internal spaceOwner;

  address internal nodeOperator;
  uint256 internal stakeRequirement;

  address internal riverToken;
  address internal bridge;
  address internal association;

  address internal mainnetDelegation;

  address internal pricingModule;
  address internal fixedPricingModule;

  // @notice - This function is called before each test function
  // @dev - It will create a new diamond contract and set the spaceFactory variable to the address of the diamond
  function setUp() public virtual {
    deployer = getDeployer();

    // deploy river token
    riverToken = deployRiverToken.deploy();
    bridge = deployRiverToken.bridgeBase();

    // deploy space factory
    spaceFactory = deploySpaceFactory.deploy();
    userEntitlement = deploySpaceFactory.userEntitlement();
    ruleEntitlement = deploySpaceFactory.ruleEntitlement();
    walletLink = deploySpaceFactory.walletLink();
    spaceOwner = deploySpaceFactory.spaceOwner();
    pricingModule = deploySpaceFactory.tieredLogPricing();
    fixedPricingModule = deploySpaceFactory.fixedPricing();
    deploySpaceFactory.postDeploy(deployer, spaceFactory);

    // deploy node operator
    mainnetDelegation = deployMainnetDelegation.deploy();
    nodeOperator = deployBaseRegistry.deploy();

    // set the space owner registry and mainnet delegation on the node operator
    // vm.startPrank(deployer);
    // NodeOperatorFacet(nodeOperator).setSpaceOwnerRegistry(spaceFactory);
    // NodeOperatorFacet(nodeOperator).setMainnetDelegation(mainnetDelegation);
    // NodeOperatorFacet(nodeOperator).setRiverToken(riverToken);
    // vm.stopPrank();
    // stakeRequirement = deployBaseRegistry.stakeRequirement();

    // create a new space
    founder = _randomAddress();

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
  }
}
