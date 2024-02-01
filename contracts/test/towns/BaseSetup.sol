// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

// libraries

// contracts

// deployments
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";
import {TownHelper} from "contracts/test/towns/TownHelper.sol";

// deployments
import {DeployTownFactory} from "contracts/scripts/deployments/DeployTownFactory.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
 * @dev - This contract is inherited by all other test contracts, it will create one diamond contract which represent the factory contract that creates all spaces
 */
contract BaseSetup is TestUtils, TownHelper {
  DeployTownFactory internal deployTownFactory = new DeployTownFactory();

  address internal deployer;
  address internal founder;
  address internal space;
  address internal everyoneSpace;
  address internal townFactory;

  address internal userEntitlement;
  address internal tokenEntitlement;
  address internal townOwner;

  // @notice - This function is called before each test function
  // @dev - It will create a new diamond contract and set the townFactory variable to the address of the diamond
  function setUp() public virtual {
    deployer = getDeployer();

    // run after diamondInitParams
    townFactory = deployTownFactory.deploy();
    userEntitlement = deployTownFactory.userEntitlement();
    tokenEntitlement = deployTownFactory.tokenEntitlement();
    townOwner = deployTownFactory.townOwner();

    // create a new space
    founder = _randomAddress();

    vm.startPrank(founder);
    space = TownArchitect(townFactory).createTown(
      _createTownInfo("BaseSetupTown")
    );
    everyoneSpace = TownArchitect(townFactory).createTown(
      _createEveryoneTownInfo("BaseSetupEveryoneTown")
    );
    vm.stopPrank();
  }
}
