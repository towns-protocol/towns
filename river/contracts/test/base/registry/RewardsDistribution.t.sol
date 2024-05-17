// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {INodeOperator} from "contracts/src/base/registry/facets/operator/INodeOperator.sol";
import {ISpaceDelegationBase} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IRewardsDistributionBase} from "contracts/src/base/registry/facets/distribution/IRewardsDistribution.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IMainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";

// libraries

// structs
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/RewardsDistribution.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";
import {INodeOperatorBase} from "contracts/src/base/registry/facets/operator/INodeOperator.sol";

contract RewardsDistributionTest is
  BaseSetup,
  IRewardsDistributionBase,
  ISpaceDelegationBase,
  IOwnableBase,
  IERC721ABase
{
  NodeOperatorFacet internal operator;
  OwnableFacet internal ownable;
  IntrospectionFacet internal introspection;
  ERC721A internal erc721;
  River internal riverFacet;
  MainnetDelegation internal mainnetDelegationFacet;
  RewardsDistribution internal rewardsDistributionFacet;
  SpaceDelegationFacet internal spaceDelegationFacet;
  SpaceOwner internal spaceOwnerFacet;

  //example test values with expected results
  uint256 exDistributionAmount;
  uint256 exTotalSpaces;
  uint256[] exAmountsPerUser;
  uint256[] exCommissionsPerOperator;
  uint256[] exDelegationsPerUser;
  uint256[] exAmountsPerSpaceUser;
  uint256[] exDelegationsPerSpaceUser;
  uint256[] exMainnetAmountsPerUser;
  uint256[] exExpectedUserAmounts;
  uint256[] exExpectedOperatorAmounts;
  uint256[] exDelegationsPerSpace;
  uint256[] exExpectedSpaceUserAmounts;
  uint256[] exExpectedMainnetUserAmounts;

  //reused by all tests to setup users, operators, delegations, etc
  Entity[] tUsers;
  Entity[] tOperators;
  Entity[] tSpaces;
  Entity[] tSpaceUsers;
  Entity[] tMainnetUsers;
  Delegation[] tDelegations;
  Delegation[] tSpaceUserDelegations;
  Delegation[] tMainnetUserDelegations;

  constructor() {
    initExTestValsWithResults();
  }

  // =============================================================
  //                           Initialization
  // =============================================================
  function setUp() public override {
    super.setUp();

    operator = NodeOperatorFacet(nodeOperator);
    ownable = OwnableFacet(nodeOperator);
    introspection = IntrospectionFacet(nodeOperator);
    erc721 = ERC721A(nodeOperator);
    riverFacet = River(riverToken);
    mainnetDelegationFacet = MainnetDelegation(baseRegistry);
    rewardsDistributionFacet = RewardsDistribution(nodeOperator);
    spaceDelegationFacet = SpaceDelegationFacet(nodeOperator);
    spaceOwnerFacet = SpaceOwner(spaceFactory);

    messenger.setXDomainMessageSender(mainnetProxyDelegation);

    cleanupData();
  }

  struct Entity {
    address addr;
    uint256 amount;
  }

  struct Delegation {
    address user;
    address operator;
  }

  // =============================================================
  //                           Tests
  // =============================================================

  //specific test case of users delegating to operators
  function test_exUserRewards() public {
    _createEntitiesForTest(
      exAmountsPerUser,
      exCommissionsPerOperator,
      exDelegationsPerUser
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);
    verifyUsersRewards(exDistributionAmount, tUsers, tOperators, tDelegations);

    verifyUserRewardsAgainstExpected(
      tMainnetUsers,
      exExpectedMainnetUserAmounts
    );
  }

  //specific test case of users delegating to operators and spaces
  function test_exUserRewardsWithSpaceDelegation() public {
    _createEntitiesForTest(
      exAmountsPerUser,
      exCommissionsPerOperator,
      exDelegationsPerUser
    );

    _createSpaceEntitiesForTest(
      exTotalSpaces,
      exAmountsPerSpaceUser,
      exDelegationsPerSpaceUser
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);
    setupSpaceDelegation(
      tOperators,
      tSpaceUsers,
      tSpaces,
      tSpaceUserDelegations,
      exDelegationsPerSpace
    );

    verifySpaceUsersRewards(
      exDistributionAmount,
      tSpaceUsers,
      tOperators,
      tSpaces,
      tDelegations,
      tSpaceUserDelegations,
      exDelegationsPerSpace
    );

    verifyUserRewardsAgainstExpected(tSpaceUsers, exExpectedSpaceUserAmounts);
  }

  //specific test case of users delegating to operators and spaces
  function test_exUserRewardsWithMainnetDelegation() public {
    _createEntitiesForTest(
      exAmountsPerUser,
      exCommissionsPerOperator,
      exDelegationsPerUser
    );

    _createMainnetEntitesForTest(
      exAmountsPerUser,
      exDelegationsPerUser,
      tOperators
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);
    setupMainnetDelegation(tMainnetUsers, tMainnetUserDelegations);

    verifyMainnetUsersRewards(
      exDistributionAmount,
      tOperators,
      tMainnetUsers,
      tDelegations,
      tMainnetUserDelegations
    );

    // verifyUserRewardsAgainstExpected(tUsers, exExpectedUserAmounts);
  }

  //specific test case for operators
  function test_exOperatorRewards() public {
    _createEntitiesForTest(
      exAmountsPerUser,
      exCommissionsPerOperator,
      exDelegationsPerUser
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);
    setupOperatorClaimAddress(tOperators);

    verifyOperatorsRewards(exDistributionAmount, tOperators);

    verifyOperatorRewardsAgainstExpected(tOperators, exExpectedOperatorAmounts);
  }

  //generic test case for users delegating to operators
  function test_userRewards(
    uint256 distributionAmount,
    uint16 totalUsers,
    uint8 totalOperators
  ) public {
    vm.assume(totalUsers < 100);
    vm.assume(totalOperators > 0 && totalOperators < 10);
    vm.assume(distributionAmount < 1000000000 * 1e18);

    uint256[] memory amountsPerUser = _createAmountsPerUser(totalUsers);
    uint256[] memory commissionsPerOperator = _createCommissionsPerOperator(
      totalOperators
    );
    uint256[] memory delegationsPerUser = _createDelegationsPerUser(
      totalUsers,
      totalOperators
    );

    _createEntitiesForTest(
      amountsPerUser,
      commissionsPerOperator,
      delegationsPerUser
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);

    verifyUsersRewards(distributionAmount, tUsers, tOperators, tDelegations);
  }

  //generic test case for users delegating to operators from mainnet
  function test_userRewardsWithMainnetDelegation(
    uint256 distributionAmount,
    uint16 totalUsers,
    uint8 totalOperators
  ) public {
    vm.assume(totalUsers < 100);
    vm.assume(totalOperators > 0 && totalOperators < 10);
    vm.assume(distributionAmount < 1000000000 * 1e18);

    uint256[] memory amountsPerUser = _createAmountsPerUser(totalUsers);
    uint256[] memory commissionsPerOperator = _createCommissionsPerOperator(
      totalOperators
    );
    uint256[] memory delegationsPerUser = _createDelegationsPerUser(
      totalUsers,
      totalOperators
    );

    uint256[] memory amountsPerMainnetUser = _createAmountsPerUser(totalUsers);
    uint256[] memory delegationsPerMainnetUser = _createDelegationsPerUser(
      totalUsers,
      totalOperators
    );

    _createEntitiesForTest(
      amountsPerUser,
      commissionsPerOperator,
      delegationsPerUser
    );

    _createMainnetEntitesForTest(
      amountsPerMainnetUser,
      delegationsPerMainnetUser,
      tOperators
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);
    setupMainnetDelegation(tMainnetUsers, tMainnetUserDelegations);

    verifyMainnetUsersRewards(
      distributionAmount,
      tOperators,
      tMainnetUsers,
      tDelegations,
      tMainnetUserDelegations
    );
  }

  //generic test case for users delegating to operators
  function test_userRewardsWithSpaceDelegation(
    uint256 distributionAmount,
    uint16 totalUsers,
    uint8 totalOperators,
    uint8 totalSpaces
  ) public {
    vm.assume(totalUsers < 50);
    vm.assume(totalOperators > 0 && totalOperators < 10);
    vm.assume(distributionAmount < 1000000000 * 1e18);
    vm.assume(totalSpaces > 0 && totalSpaces < 10);

    uint256[] memory amountsPerUser = _createAmountsPerUser(totalUsers);
    uint256[] memory commissionsPerOperator = _createCommissionsPerOperator(
      totalOperators
    );

    uint256[] memory delegationsPerUser = _createDelegationsPerUser(
      totalUsers,
      totalOperators
    );

    uint256[] memory amountsPerSpaceUser = _createAmountsPerUser(totalUsers);

    uint256[] memory delegationsPerSpaceUser = _createDelegationsPerUser(
      totalUsers,
      totalSpaces
    );

    uint256[] memory delegationsPerSpace = _createDelegationsPerUser(
      totalSpaces,
      totalOperators
    );

    _createEntitiesForTest(
      amountsPerUser,
      commissionsPerOperator,
      delegationsPerUser
    );

    _createSpaceEntitiesForTest(
      totalSpaces,
      amountsPerSpaceUser,
      delegationsPerSpaceUser
    );

    setupOperators(tOperators);
    setupUsersAndDelegation(tUsers, tDelegations);

    setupSpaceDelegation(
      tOperators,
      tSpaceUsers,
      tSpaces,
      tSpaceUserDelegations,
      delegationsPerSpace
    );

    verifySpaceUsersRewards(
      distributionAmount,
      tSpaceUsers,
      tOperators,
      tSpaces,
      tDelegations,
      tSpaceUserDelegations,
      delegationsPerSpace
    );
  }

  function test_OperatorRewards(
    uint256 distributionAmount,
    uint16 totalUsers,
    uint8 totalOperators
  ) public {
    cleanupData();

    vm.assume(totalUsers < 100);
    vm.assume(totalOperators > 0 && totalOperators < 10);
    vm.assume(distributionAmount < 1000000000 * 1e18);

    uint256[] memory amountsPerUser = _createAmountsPerUser(totalUsers);
    uint256[] memory commissionsPerOperator = _createCommissionsPerOperator(
      totalOperators
    );
    uint256[] memory delegationsPerUser = _createDelegationsPerUser(
      totalUsers,
      totalOperators
    );

    _createEntitiesForTest(
      amountsPerUser,
      commissionsPerOperator,
      delegationsPerUser
    );

    setupOperators(tOperators);
    setupOperatorClaimAddress(tOperators);
    verifyOperatorsRewards(distributionAmount, tOperators);
  }

  // =============================================================
  //                           Assertions
  // =============================================================

  function setupOperators(
    Entity[] memory operators
  )
    internal
    givenOperatorsHaveRegistered(operators)
    givenOperatorsHaveCommissionRates(operators)
    givenOperatorsHaveBeenApproved(operators)
  {}

  function setupUsersAndDelegation(
    Entity[] memory users,
    Delegation[] memory delegations
  )
    internal
    givenUsersHaveBridgedTokens(users)
    givenUsersHaveDelegatedToOperators(delegations)
  {}

  function setupSpaceDelegation(
    Entity[] memory operators,
    Entity[] memory spaceUsers,
    Entity[] memory spaces,
    Delegation[] memory spaceDelegations,
    uint256[] memory spaceDelegationsPerSpace
  )
    internal
    givenUsersHaveBridgedTokens(spaceUsers)
    givenUsersHaveDelegatedToOperators(spaceDelegations)
    givenSpacesHavePointedToOperators(
      operators,
      spaces,
      spaceDelegationsPerSpace
    )
  {}

  function setupMainnetDelegation(
    Entity[] memory mainnetUsers,
    Delegation[] memory mainnetUserDelegations
  )
    internal
    givenMainnetUsersHaveDelegatedToOperators(
      mainnetUsers,
      mainnetUserDelegations
    )
  {}

  function setupOperatorClaimAddress(
    Entity[] memory operators
  ) internal givenOperatorsHaveSetClaimAddresses(operators) {}

  function verifyUsersRewards(
    uint256 distributionAmount,
    Entity[] memory users,
    Entity[] memory operators,
    Delegation[] memory delegations
  )
    internal
    givenWeeklyDistributionAmountHasBeenSet(distributionAmount)
    givenFundsHaveBeenDisbursed(operators, distributionAmount)
  {
    for (uint256 i = 0; i < users.length; i++) {
      uint256 reward = rewardsDistributionFacet.getClaimableAmount(
        users[i].addr
      );
      uint256 expectedReward = _calculateExpectedUserReward(
        users[i].addr,
        distributionAmount,
        operators,
        delegations
      );
      assertEq(
        reward,
        expectedReward,
        "User Reward does not match expected reward"
      );
    }
  }

  function verifySpaceUsersRewards(
    uint256 distributionAmount,
    Entity[] memory spaceUsers,
    Entity[] memory operators,
    Entity[] memory spaces,
    Delegation[] memory delegations,
    Delegation[] memory spaceUserDelegations,
    uint256[] memory spaceDelegationsPerSpace
  )
    internal
    givenWeeklyDistributionAmountHasBeenSet(distributionAmount)
    givenFundsHaveBeenDisbursed(operators, distributionAmount)
  {
    for (uint256 i = 0; i < spaceUsers.length; i++) {
      uint256 reward = rewardsDistributionFacet.getClaimableAmount(
        spaceUsers[i].addr
      );
      uint256 expectedReward = _calculateExpectedSpaceUserReward(
        spaceUsers[i].addr,
        distributionAmount,
        operators,
        spaces,
        delegations,
        spaceUserDelegations,
        spaceDelegationsPerSpace
      );

      assertEq(
        reward,
        expectedReward,
        "User Reward does not match expected reward"
      );
    }
  }

  function verifyMainnetUsersRewards(
    uint256 distributionAmount,
    Entity[] memory operators,
    Entity[] memory mainnetUsers,
    Delegation[] memory delegations,
    Delegation[] memory mainnetUserDelegations
  )
    internal
    givenWeeklyDistributionAmountHasBeenSet(distributionAmount)
    givenFundsHaveBeenDisbursed(operators, distributionAmount)
  {
    for (uint256 i = 0; i < mainnetUsers.length; i++) {
      uint256 reward = rewardsDistributionFacet.getClaimableAmount(
        mainnetUsers[i].addr
      );
      address operatorAddr;

      //find operator this user is delegating to:
      for (uint256 j = 0; j < mainnetUserDelegations.length; j++) {
        if (mainnetUserDelegations[j].user == mainnetUsers[i].addr) {
          operatorAddr = mainnetUserDelegations[j].operator;
          break;
        }
      }

      uint256 expectedReward = _calculateExpectedMainnetUserReward(
        mainnetUsers[i].addr,
        operatorAddr,
        distributionAmount,
        operators,
        mainnetUsers,
        delegations,
        mainnetUserDelegations
      );
      assertEq(
        reward,
        expectedReward,
        "User Reward does not match expected reward"
      );
    }
  }

  function verifyOperatorsRewards(
    uint256 distributionAmount,
    Entity[] memory operators
  )
    internal
    givenWeeklyDistributionAmountHasBeenSet(distributionAmount)
    givenFundsHaveBeenDisbursed(operators, distributionAmount)
  {
    for (uint256 i = 0; i < operators.length; i++) {
      uint256 reward = rewardsDistributionFacet.getClaimableAmount(
        operator.getClaimAddress(operators[i].addr)
      );

      uint256 expectedReward = _calculateExpectedOperatorReward(
        operators[i].amount,
        distributionAmount / operators.length
      );

      assertEq(
        reward,
        expectedReward,
        "Operator Reward does not match calculated expected reward"
      );
    }
  }

  function verifyUserRewardsAgainstExpected(
    Entity[] memory users,
    uint256[] memory expectedUserClaims
  ) internal {
    for (uint256 i = 0; i < users.length; i++) {
      uint256 reward = rewardsDistributionFacet.getClaimableAmount(
        users[i].addr
      );
      assertEq(
        reward,
        expectedUserClaims[i],
        "User Reward does not match expected reward"
      );
    }
  }

  function verifyOperatorRewardsAgainstExpected(
    Entity[] memory operators,
    uint256[] memory expectedOperatorClaims
  ) internal {
    for (uint256 i = 0; i < operators.length; i++) {
      uint256 reward = rewardsDistributionFacet.getClaimableAmount(
        operator.getClaimAddress(operators[i].addr)
      );

      assertEq(
        reward,
        expectedOperatorClaims[i],
        "Operator Reward does not match expected reward"
      );
    }
  }

  // =============================================================
  //                           Test Calculations
  // =============================================================

  function _calculateExpectedUserReward(
    address user,
    uint256 totalDistribution,
    Entity[] memory operators,
    Delegation[] memory delegations
  ) internal view returns (uint256) {
    uint256 userDelegatedAmount = IERC20(riverFacet).balanceOf(user);
    address operatorAddr = _getOperatorDelegatee(user);

    uint256 delegatorsReward = _calculateDelegatorsRewardForOperator(
      operatorAddr,
      operators,
      totalDistribution
    );

    uint256 totalDelegatedToOperator = _getDelegatedAmountToOperator(
      operatorAddr,
      delegations
    );

    return (delegatorsReward * userDelegatedAmount) / totalDelegatedToOperator;
  }

  function _calculateExpectedMainnetUserReward(
    address user,
    address operatorAddr,
    uint256 totalDistribution,
    Entity[] memory operators,
    Entity[] memory mainnetUsers,
    Delegation[] memory delegations,
    Delegation[] memory mainnetUserDelegations
  ) internal view returns (uint256) {
    uint256 userDelegatedAmount = 0;

    for (uint256 i = 0; i < mainnetUsers.length; i++) {
      if (mainnetUsers[i].addr == user) {
        userDelegatedAmount = mainnetUsers[i].amount;
        break;
      }
    }

    uint256 delegatorsReward = _calculateDelegatorsRewardForOperator(
      operatorAddr,
      operators,
      totalDistribution
    );

    uint256 totalDelegatedToOperator = _getDelegatedAmountToOperatorWithMainnet(
      operatorAddr,
      delegations,
      mainnetUsers,
      mainnetUserDelegations
    );

    return (delegatorsReward * userDelegatedAmount) / totalDelegatedToOperator;
  }

  function _calculateExpectedSpaceUserReward(
    address spaceUser,
    uint256 totalDistribution,
    Entity[] memory operators,
    Entity[] memory spaces,
    Delegation[] memory delegations,
    Delegation[] memory spaceDelegations,
    uint256[] memory spaceDelegationsPerSpace
  ) internal view returns (uint256) {
    uint256 spaceUserDelegatedAmount = IERC20(riverFacet).balanceOf(spaceUser);

    address space = _getOperatorDelegatee(spaceUser);
    address operatorAddr = spaceDelegationFacet.getSpaceDelegation(space);
    uint256 delegatorsReward = _calculateDelegatorsRewardForOperator(
      operatorAddr,
      operators,
      totalDistribution
    );

    uint256 totalDelegatedToOperator = _getDelegatedAmountToOperatorWithSpaces(
      operatorAddr,
      operators,
      spaces,
      delegations,
      spaceDelegations,
      spaceDelegationsPerSpace
    );

    return
      (delegatorsReward * spaceUserDelegatedAmount) / totalDelegatedToOperator;
  }

  function _calculateDelegatorsRewardForOperator(
    address operatorAddr,
    Entity[] memory operators,
    uint256 totalDistribution
  ) internal pure returns (uint256) {
    uint256 commission = _getCommissionForOperator(operatorAddr, operators);

    uint256 operatorShare = totalDistribution / operators.length;
    uint256 operatorReward = _calculateExpectedOperatorReward(
      commission,
      operatorShare
    );
    uint256 delegatorsReward = operatorShare - operatorReward;
    return delegatorsReward;
  }

  function _calculateExpectedOperatorReward(
    uint256 commission,
    uint256 operatorShare
  ) internal pure returns (uint256) {
    uint256 operatorReward = (operatorShare * commission) / 100;
    return operatorReward;
  }

  // =============================================================
  //                           Utilities
  // =============================================================

  function cleanupData() internal {
    for (uint256 i = 0; i < tUsers.length; i++) {
      tUsers.pop();
    }
    for (uint256 i = 0; i < tOperators.length; i++) {
      tOperators.pop();
    }
    for (uint256 i = 0; i < tSpaces.length; i++) {
      tSpaces.pop();
    }
    for (uint256 i = 0; i < tSpaceUsers.length; i++) {
      tSpaceUsers.pop();
    }
    for (uint256 i = 0; i < tDelegations.length; i++) {
      tDelegations.pop();
    }
    for (uint256 i = 0; i < tSpaceUserDelegations.length; i++) {
      tSpaceUserDelegations.pop();
    }
  }

  function _createEntitiesForTest(
    uint256[] memory amountsPerUser,
    uint256[] memory commissionsPerOperator,
    uint256[] memory delegationsPerUser
  ) internal {
    Entity[] memory users = _createEntities(amountsPerUser);

    for (uint256 i = 0; i < users.length; i++) {
      tUsers.push(users[i]);
    }

    Entity[] memory operators = _createEntities(commissionsPerOperator);
    for (uint256 i = 0; i < operators.length; i++) {
      tOperators.push(operators[i]);
    }

    Delegation[] memory delegations = _createDelegations(
      users,
      operators,
      delegationsPerUser
    );
    for (uint256 i = 0; i < delegations.length; i++) {
      tDelegations.push(delegations[i]);
    }
  }

  function _createSpaceEntitiesForTest(
    uint256 totalSpaces,
    uint256[] memory amountsPerSpaceUser,
    uint256[] memory delegationsPerSpaceUser
  ) internal {
    Entity[] memory users = _createEntities(amountsPerSpaceUser);
    for (uint256 i = 0; i < users.length; i++) {
      Entity memory spaceUser = Entity(users[i].addr, users[i].amount);
      tSpaceUsers.push(spaceUser);
    }

    Entity[] memory spaces = _createSpaces(totalSpaces);
    for (uint256 i = 0; i < spaces.length; i++) {
      Entity memory space = Entity(spaces[i].addr, 0);
      tSpaces.push(space);
    }

    Delegation[] memory delegations = _createDelegations(
      users,
      spaces,
      delegationsPerSpaceUser
    );
    for (uint256 i = 0; i < delegations.length; i++) {
      Delegation memory spaceUserDelegation = Delegation({
        user: delegations[i].user,
        operator: delegations[i].operator
      });
      tSpaceUserDelegations.push(spaceUserDelegation);
    }
  }

  function _createMainnetEntitesForTest(
    uint256[] memory amountsPerMainnetUser,
    uint256[] memory delegationsPerMainnetUser,
    Entity[] memory operators
  ) internal {
    Entity[] memory users = _createEntities(amountsPerMainnetUser);
    for (uint256 i = 0; i < users.length; i++) {
      Entity memory user = Entity(users[i].addr, users[i].amount);
      tMainnetUsers.push(user);
    }

    Delegation[] memory delegations = _createDelegations(
      users,
      operators,
      delegationsPerMainnetUser
    );
    for (uint256 i = 0; i < delegations.length; i++) {
      tMainnetUserDelegations.push(delegations[i]);
    }
  }

  function _createAmountsPerUser(
    uint16 totalUsers
  ) internal view returns (uint256[] memory) {
    uint256[] memory amountsPerUser = new uint256[](totalUsers);
    for (uint256 i = 0; i < totalUsers; i++) {
      amountsPerUser[i] = _generateRandom(0, 10000000 * 1e18);
    }
    return amountsPerUser;
  }

  function _createCommissionsPerOperator(
    uint8 totalOperators
  ) internal view returns (uint256[] memory) {
    uint256[] memory commissionsPerOperator = new uint256[](totalOperators);
    for (uint256 i = 0; i < totalOperators; i++) {
      uint256 commission = _generateRandom(0, 100);
      commissionsPerOperator[i] = commission;
    }
    return commissionsPerOperator;
  }

  function _createDelegationsPerUser(
    uint256 totalUsers,
    uint256 totalOperators
  ) internal view returns (uint256[] memory) {
    uint256[] memory delegationsPerUser = new uint256[](totalUsers);
    for (uint256 i = 0; i < totalUsers; i++) {
      delegationsPerUser[i] = _generateRandom(0, totalOperators - 1);
    }
    return delegationsPerUser;
  }

  function _createEntities(
    uint256[] memory amountsPerUser
  ) internal view returns (Entity[] memory) {
    Entity[] memory users = new Entity[](amountsPerUser.length);
    for (uint256 i = 0; i < amountsPerUser.length; i++) {
      users[i] = Entity(_getRandomAddress(), amountsPerUser[i]);
    }
    return users;
  }

  function _createEntitiesFromAddresses(
    address[] memory addrs,
    uint256[] memory amountsPerUser
  ) internal pure returns (Entity[] memory) {
    Entity[] memory users = new Entity[](addrs.length);
    for (uint256 i = 0; i < addrs.length; i++) {
      users[i] = Entity(addrs[i], amountsPerUser[i]);
    }
    return users;
  }

  function _createSpaces(
    uint256 numberOfSpaces
  ) internal returns (Entity[] memory) {
    Entity[] memory spaces = new Entity[](numberOfSpaces);

    for (uint256 i = 0; i < numberOfSpaces; i++) {
      vm.prank(_randomAddress());
      string memory spaceName = string(abi.encodePacked("Space", i));
      IArchitectBase.SpaceInfo
        memory everyoneSpaceInfo = _createEveryoneSpaceInfo(spaceName);
      everyoneSpaceInfo.membership.settings.pricingModule = fixedPricingModule;

      address everyoneSpace = Architect(spaceFactory).createSpace(
        everyoneSpaceInfo
      );

      spaces[i] = Entity(everyoneSpace, 0);
    }
    return spaces;
  }

  function _createDelegations(
    Entity[] memory users,
    Entity[] memory operators,
    uint256[] memory delegationsPerUser
  ) internal pure returns (Delegation[] memory) {
    Delegation[] memory delegations = new Delegation[](
      delegationsPerUser.length
    );
    for (uint256 i = 0; i < delegationsPerUser.length; i++) {
      delegations[i] = Delegation({
        user: users[i].addr,
        operator: operators[delegationsPerUser[i]].addr
      });
    }
    return delegations;
  }

  function _generateRandom(
    uint256 number1,
    uint256 number2
  ) internal view returns (uint256) {
    vm.assume(number2 > number1);
    require(number2 > number1, "number2 must be greater than number1");
    uint256 range = number2 - number1 + 1;
    uint256 randomNumber = uint256(
      keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao))
    ) % range;
    return number1 + randomNumber;
  }

  function _getRandomAddress() internal view returns (address) {
    address addr = _randomAddress();
    return addr;
  }

  //used to test specific results given known input
  function initExTestValsWithResults() internal {
    exDistributionAmount = 999 * 1e18;

    exAmountsPerUser.push(1000 * 1e18);
    exAmountsPerUser.push(2000 * 1e18);
    exAmountsPerUser.push(3000 * 1e18);
    exAmountsPerUser.push(4000 * 1e18);

    exCommissionsPerOperator.push(10);
    exCommissionsPerOperator.push(15);
    exCommissionsPerOperator.push(20);

    exDelegationsPerUser.push(0);
    exDelegationsPerUser.push(0);
    exDelegationsPerUser.push(1);
    exDelegationsPerUser.push(2);

    exAmountsPerSpaceUser.push(1000 * 1e18);
    exAmountsPerSpaceUser.push(2000 * 1e18);
    exAmountsPerSpaceUser.push(3000 * 1e18);
    exAmountsPerSpaceUser.push(4000 * 1e18);

    exTotalSpaces = 3;

    exDelegationsPerSpaceUser.push(0);
    exDelegationsPerSpaceUser.push(0);
    exDelegationsPerSpaceUser.push(1);
    exDelegationsPerSpaceUser.push(2);

    exDelegationsPerSpace.push(0);
    exDelegationsPerSpace.push(1);
    exDelegationsPerSpace.push(2);

    exMainnetAmountsPerUser.push(1000 * 1e18);
    exMainnetAmountsPerUser.push(2000 * 1e18);
    exMainnetAmountsPerUser.push(3000 * 1e18);
    exMainnetAmountsPerUser.push(4000 * 1e18);

    exExpectedUserAmounts.push(999 * 1e17);
    exExpectedUserAmounts.push(1998 * 1e17);
    exExpectedUserAmounts.push(28305 * 1e16);
    exExpectedUserAmounts.push(2664 * 1e17);

    exExpectedOperatorAmounts.push(333 * 1e17);
    exExpectedOperatorAmounts.push(4995 * 1e16);
    exExpectedOperatorAmounts.push(666 * 1e17);

    exExpectedSpaceUserAmounts.push(4995 * 1e16);
    exExpectedSpaceUserAmounts.push(999 * 1e17);
    exExpectedSpaceUserAmounts.push(141525 * 1e15);
    exExpectedSpaceUserAmounts.push(1332 * 1e17);

    exExpectedMainnetUserAmounts.push(4995 * 1e16);
    exExpectedMainnetUserAmounts.push(999 * 1e17);
    exExpectedMainnetUserAmounts.push(141525 * 1e15);
    exExpectedMainnetUserAmounts.push(1332 * 1e17);
  }

  // =============================================================
  //                           Getters
  // =============================================================

  function _getCommissionForOperator(
    address operatorAddr,
    Entity[] memory operators
  ) internal pure returns (uint256) {
    for (uint256 i = 0; i < operators.length; i++) {
      if (operators[i].addr == operatorAddr) {
        return operators[i].amount;
      }
    }
    return 0;
  }

  function _getDelegatedAmountToOperator(
    address operatorAddr,
    Delegation[] memory delegations
  ) internal view returns (uint256) {
    uint256 totalDelegated = 0;
    for (uint256 i = 0; i < delegations.length; i++) {
      if (delegations[i].operator == operatorAddr) {
        totalDelegated += IERC20(riverFacet).balanceOf(delegations[i].user);
      }
    }
    return totalDelegated;
  }

  function _getDelegatedAmountToOperatorWithMainnet(
    address operatorAddr,
    Delegation[] memory delegations,
    Entity[] memory mainnetUsers,
    Delegation[] memory mainnetUserDelegations
  ) internal view returns (uint256) {
    uint256 totalDelegated = 0;
    for (uint256 i = 0; i < delegations.length; i++) {
      if (delegations[i].operator == operatorAddr) {
        totalDelegated += IERC20(riverFacet).balanceOf(delegations[i].user);
      }
    }

    //iterate through mainnetUserDelegations, find the users that are delegating to this operator
    //add the user's balance to the total delegated amount for that operator
    for (uint256 i = 0; i < mainnetUserDelegations.length; i++) {
      if (mainnetUserDelegations[i].operator == operatorAddr) {
        address user = mainnetUserDelegations[i].user;
        for (uint256 j = 0; j < mainnetUsers.length; j++) {
          if (mainnetUsers[j].addr == user) {
            totalDelegated += mainnetUsers[j].amount;
            break;
          }
        }
      }
    }
    return totalDelegated;
  }

  function _getDelegatedAmountToOperatorWithSpaces(
    address operatorAddr,
    Entity[] memory operators,
    Entity[] memory spaces,
    Delegation[] memory delegations,
    Delegation[] memory spaceUserDelegations,
    uint256[] memory spaceDelegationsPerSpace
  ) internal view returns (uint256) {
    uint256 totalDelegated = 0;
    for (uint256 i = 0; i < delegations.length; i++) {
      if (delegations[i].operator == operatorAddr) {
        totalDelegated += IERC20(riverFacet).balanceOf(delegations[i].user);
      }
    }

    //iterate through spaceUserDelegations, find the space that the user is delegating to
    //find the operator that the space is delegating to that matches the operator we're searching for
    //add the user's balance to the total delegated amount for that operator
    for (uint256 i = 0; i < spaceUserDelegations.length; i++) {
      address user = spaceUserDelegations[i].user;
      // Assuming you can find the index of the space in the spaces array
      uint256 spaceIndex = _findSpaceIndex(
        spaceUserDelegations[i].operator,
        spaces
      );
      uint256 operatorIndex = spaceDelegationsPerSpace[spaceIndex];

      if (operators[operatorIndex].addr == operatorAddr) {
        totalDelegated += IERC20(riverFacet).balanceOf(user);
      }
    }

    return totalDelegated;
  }

  function _findSpaceIndex(
    address space,
    Entity[] memory spaces
  ) private pure returns (uint256) {
    for (uint256 i = 0; i < spaces.length; i++) {
      if (spaces[i].addr == space) {
        return i;
      }
    }
    revert("Space not found");
  }

  function _getOperatorDelegatee(
    address delegator
  ) internal view returns (address) {
    // get the delegatee that the delegator is voting for
    address delegatee = IVotes(riverFacet).delegates(delegator);
    // if the delegatee is a space, get the operator that the space is delegating to
    address spaceDelegatee = address(0); //operatorBySpace[delegatee];
    address actualOperator = spaceDelegatee != address(0)
      ? spaceDelegatee
      : delegatee;
    return actualOperator;
  }

  // =============================================================
  //                           Actions
  // =============================================================

  function bridgeTokensForUser(address user, uint256 amount) internal {
    vm.assume(user != address(0));
    vm.prank(bridge);
    riverFacet.mint(user, amount);
  }

  function registerOperator(address operatorAddr) internal {
    vm.assume(operatorAddr != address(0));
    vm.expectEmit();
    emit INodeOperatorBase.OperatorRegistered(operatorAddr);
    vm.prank(operatorAddr);
    operator.registerOperator();
  }

  function setOperatorCommissionRate(
    address operatorAddr,
    uint256 commission
  ) internal {
    vm.assume(operatorAddr != address(0));
    vm.assume(0 <= commission && commission <= 100);
    vm.expectEmit();
    emit INodeOperatorBase.OperatorCommissionChanged(operatorAddr, commission);
    vm.prank(operatorAddr);
    operator.setCommissionRate(commission);
  }

  function setOperatorClaimAddress(
    address operatorAddr,
    address claimAddr
  ) internal {
    vm.assume(operatorAddr != address(0));
    vm.assume(claimAddr != address(0));
    vm.expectEmit();
    emit INodeOperatorBase.OperatorClaimAddressChanged(operatorAddr, claimAddr);
    vm.prank(operatorAddr);
    operator.setClaimAddress(claimAddr);
  }

  function delegateToOperator(address user, address operatorAddr) internal {
    vm.assume(user != address(0));
    vm.assume(operatorAddr != address(0));
    vm.expectEmit();
    emit IVotes.DelegateChanged(user, address(0), operatorAddr);
    vm.prank(user);
    riverFacet.delegate(operatorAddr);
  }

  function setOperatorStatus(
    address operatorAddr,
    NodeOperatorStatus newStatus
  ) internal {
    vm.assume(operatorAddr != address(0));
    vm.expectEmit();
    emit INodeOperatorBase.OperatorStatusChanged(operatorAddr, newStatus);
    vm.prank(deployer);
    operator.setOperatorStatus(operatorAddr, newStatus);
  }

  function pointSpaceToOperator(address space, address operatorAddr) internal {
    vm.assume(space != address(0));
    vm.assume(operatorAddr != address(0));
    vm.expectEmit();
    emit SpaceDelegatedToOperator(space, operatorAddr);
    // address owner = spaceOwnerFacet.ownerOf(spaceOwnerFacet.getSpace(space));
    vm.prank(IERC173(space).owner());
    spaceDelegationFacet.addSpaceDelegation(space, operatorAddr);
  }

  function mainnetDelegateToOperator(
    Entity memory user,
    address operatorAddr
  ) internal {
    vm.assume(user.addr != address(0));
    vm.assume(operatorAddr != address(0));
    vm.expectEmit();
    emit IMainnetDelegationBase.DelegationSet(
      user.addr,
      operatorAddr,
      user.amount
    );

    vm.prank(address(messenger));
    mainnetDelegationFacet.setDelegation(user.addr, operatorAddr, user.amount);
  }

  // =============================================================
  //                           Modifiers
  // =============================================================

  modifier givenCallerHasBridgedTokens(address caller, uint256 amount) {
    bridgeTokensForUser(caller, amount);
    _;
  }

  modifier givenUsersHaveBridgedTokens(Entity[] memory users) {
    for (uint256 i = 0; i < users.length; i++) {
      bridgeTokensForUser(users[i].addr, users[i].amount);
    }
    _;
  }

  modifier givenOperatorIsRegistered(address operatorAddr) {
    registerOperator(operatorAddr);
    _;
  }

  modifier givenOperatorsHaveRegistered(Entity[] memory operators) {
    for (uint256 i = 0; i < operators.length; i++) {
      registerOperator(operators[i].addr);
    }
    _;
  }

  modifier givenOperatorHasCommissionRate(
    address operatorAddr,
    uint256 commission
  ) {
    setOperatorCommissionRate(operatorAddr, commission);
    _;
  }

  modifier givenOperatorsHaveCommissionRates(Entity[] memory operators) {
    for (uint256 i = 0; i < operators.length; i++) {
      setOperatorCommissionRate(operators[i].addr, operators[i].amount);
    }
    _;
  }

  modifier givenOperatorHasSetClaimAddress(
    address operatorAddr,
    address claimAddr
  ) {
    setOperatorClaimAddress(operatorAddr, claimAddr);
    _;
  }

  modifier givenOperatorsHaveSetClaimAddresses(Entity[] memory operators) {
    for (uint256 i = 0; i < operators.length; i++) {
      setOperatorClaimAddress(operators[i].addr, _getRandomAddress());
    }
    _;
  }

  modifier givenUserHasDelegatedToOperator(address user, address operatorAddr) {
    delegateToOperator(user, operatorAddr);
    _;
  }

  modifier givenUsersHaveDelegatedToOperators(Delegation[] memory delegations) {
    for (uint256 i = 0; i < delegations.length; i++) {
      delegateToOperator(delegations[i].user, delegations[i].operator);
    }
    _;
  }

  modifier givenMainnetUserHasDelegatedToOperator(
    Entity memory user,
    address operatorAddr
  ) {
    mainnetDelegateToOperator(user, operatorAddr);
    _;
  }

  modifier givenMainnetUsersHaveDelegatedToOperators(
    Entity[] memory users,
    Delegation[] memory delegations
  ) {
    //for every delegation, get the user
    for (uint256 i = 0; i < delegations.length; i++) {
      address user = delegations[i].user;
      //then loop through the users
      for (uint256 j = 0; j < users.length; j++) {
        if (users[j].addr == user) {
          mainnetDelegateToOperator(users[j], delegations[i].operator);
          break;
        }
      }
    }
    _;
  }

  modifier givenSpacesHavePointedToOperators(
    Entity[] memory operators,
    Entity[] memory spaces,
    uint256[] memory delegationsPerSpace
  ) {
    for (uint256 i = 0; i < delegationsPerSpace.length; i++) {
      pointSpaceToOperator(
        spaces[i].addr,
        operators[delegationsPerSpace[i]].addr
      );
    }
    _;
  }

  modifier givenSpaceHasPointedToOperator(address space, address operatorAddr) {
    pointSpaceToOperator(space, operatorAddr);
    _;
  }

  modifier givenOperatorHasBeenApproved(address _operator) {
    setOperatorStatus(_operator, NodeOperatorStatus.Approved);
    _;
  }

  modifier givenOperatorsHaveBeenApproved(Entity[] memory operators) {
    for (uint256 i = 0; i < operators.length; i++) {
      setOperatorStatus(operators[i].addr, NodeOperatorStatus.Approved);
    }
    _;
  }

  modifier givenWeeklyDistributionAmountHasBeenSet(uint256 amount) {
    vm.prank(deployer);
    rewardsDistributionFacet.setWeeklyDistributionAmount(amount);
    _;
  }

  modifier givenFundsHaveBeenDisbursed(
    Entity[] memory operators,
    uint256 amount
  ) {
    uint256 operatorAmount = amount / operators.length;
    for (uint256 i = 0; i < operators.length; i++) {
      vm.expectEmit();
      emit RewardsDistributed(
        operators[i].addr,
        (operatorAmount * operators[i].amount) / 100
      );
      vm.prank(deployer);
      rewardsDistributionFacet.distributeRewards(operators[i].addr);
    }
    _;
  }
}
