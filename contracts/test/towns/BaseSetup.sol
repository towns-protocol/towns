// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// libraries

// contracts

// deployments
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {TownHelper} from "contracts/test/towns/TownHelper.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {NodeOperatorFacet} from "contracts/src/node/operator/NodeOperatorFacet.sol";

// deployments
import {DeployTownFactory} from "contracts/scripts/deployments/DeployTownFactory.s.sol";
import {DeployNodeOperator} from "contracts/scripts/deployments/DeployNodeOperator.s.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/DeployRiverBase.s.sol";
import {DeployMainnetDelegation} from "contracts/scripts/deployments/DeployMainnetDelegation.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
 * @dev - This contract is inherited by all other test contracts, it will create one diamond contract which represent the factory contract that creates all spaces
 */
contract BaseSetup is TestUtils, TownHelper {
  DeployTownFactory internal deployTownFactory = new DeployTownFactory();
  DeployNodeOperator internal deployNodeOperator = new DeployNodeOperator();
  DeployRiverBase internal deployRiverToken = new DeployRiverBase();
  DeployMainnetDelegation internal deployMainnetDelegation =
    new DeployMainnetDelegation();

  address internal deployer;
  address internal founder;
  address internal space;
  address internal everyoneSpace;
  address internal spaceFactory;

  address internal userEntitlement;
  address internal tokenEntitlement;
  address internal townOwner;

  address internal nodeOperator;
  uint256 internal stakeRequirement;

  address internal riverToken;
  address internal bridge;
  address internal association;

  address internal mainnetDelegation;

  // @notice - This function is called before each test function
  // @dev - It will create a new diamond contract and set the spaceFactory variable to the address of the diamond
  function setUp() public virtual {
    deployer = getDeployer();

    // deploy river token
    riverToken = deployRiverToken.deploy();
    bridge = deployRiverToken.bridgeBase();

    // deploy space factory
    spaceFactory = deployTownFactory.deploy();
    userEntitlement = deployTownFactory.userEntitlement();
    tokenEntitlement = deployTownFactory.tokenEntitlement();
    townOwner = deployTownFactory.townOwner();
    deployTownFactory.postDeploy(deployer, spaceFactory);

    // deploy node operator
    mainnetDelegation = deployMainnetDelegation.deploy();
    nodeOperator = deployNodeOperator.deploy();

    // set the space owner registry and mainnet delegation on the node operator
    vm.startPrank(deployer);
    NodeOperatorFacet(nodeOperator).setSpaceOwnerRegistry(spaceFactory);
    NodeOperatorFacet(nodeOperator).setMainnetDelegation(mainnetDelegation);
    NodeOperatorFacet(nodeOperator).setRiverToken(riverToken);
    vm.stopPrank();

    stakeRequirement = deployNodeOperator.stakeRequirement();

    // create a new space
    founder = _randomAddress();

    vm.startPrank(founder);
    space = TownArchitect(spaceFactory).createTown(
      _createTownInfo("BaseSetupTown")
    );
    everyoneSpace = TownArchitect(spaceFactory).createTown(
      _createEveryoneTownInfo("BaseSetupEveryoneTown")
    );
    vm.stopPrank();
  }
}
