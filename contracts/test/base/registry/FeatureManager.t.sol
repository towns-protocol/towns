// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureManager} from "contracts/src/base/registry/facets/feature/FeatureManager.sol";
import {IFeatureManagerFacetBase} from "contracts/src/base/registry/facets/feature/IFeatureManagerFacet.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {FeatureManagerFacet} from "contracts/src/base/registry/facets/feature/FeatureManagerFacet.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";

// mocks
import {MockERC20} from "contracts/test/mocks/MockERC20.sol";

contract FeatureManagerTest is BaseSetup, IFeatureManagerFacetBase {
  FeatureManagerFacet featureManagerFacet;
  Towns towns;

  bytes32 constant TEST_FEATURE_ID = keccak256("test.feature");
  uint256 constant TEST_THRESHOLD = 100 ether;

  function setUp() public override {
    super.setUp();
    featureManagerFacet = FeatureManagerFacet(baseRegistry);
    towns = Towns(townsToken);
  }

  modifier givenFeatureConditionIsSet(
    bytes32 featureId,
    FeatureManager.Condition memory condition,
    address to,
    uint256 amount
  ) {
    vm.assume(amount > 0 && amount < type(uint256).max);
    vm.assume(condition.threshold > 0 && condition.threshold < amount);

    condition.token = address(townsToken);

    vm.prank(bridge);
    towns.mint(to, amount);

    vm.prank(deployer);
    vm.expectEmit(address(featureManagerFacet));
    emit FeatureConditionSet(featureId, condition);
    featureManagerFacet.setFeatureCondition(featureId, condition);
    _;
  }

  modifier givenTokensAreMinted(address to, uint256 amount) {
    vm.assume(amount > 0 && amount < type(uint256).max);
    vm.prank(bridge);
    towns.mint(to, amount);
    _;
  }

  function test_featureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition,
    address to,
    uint256 amount
  ) external givenFeatureConditionIsSet(featureId, condition, to, amount) {
    FeatureManager.Condition memory currentCondition = featureManagerFacet
      .getFeatureCondition(featureId);
    assertEq(currentCondition.token, address(townsToken));
    assertEq(currentCondition.threshold, condition.threshold);
    assertEq(currentCondition.active, condition.active);
  }

  function test_revertWith_setFeatureCondition_invalidToken() external {
    FeatureManager.Condition memory condition = FeatureManager.Condition({
      token: address(0),
      threshold: TEST_THRESHOLD,
      active: true,
      extraData: ""
    });

    vm.prank(deployer);
    vm.expectRevert(InvalidToken.selector);
    featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
  }

  function test_revertWith_setFeatureCondition_invalidInterface() external {
    MockERC20 mockToken = new MockERC20("Mock Token", "MTK");

    FeatureManager.Condition memory condition = FeatureManager.Condition({
      token: address(mockToken),
      threshold: TEST_THRESHOLD,
      active: true,
      extraData: ""
    });

    vm.prank(deployer);
    vm.expectRevert(InvalidInterface.selector);
    featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
  }

  function test_revertWith_setFeatureCondition_invalidTotalSupply() external {
    FeatureManager.Condition memory condition = FeatureManager.Condition({
      token: address(townsToken),
      threshold: TEST_THRESHOLD,
      active: true,
      extraData: ""
    });

    vm.prank(deployer);
    vm.expectRevert(InvalidTotalSupply.selector);
    featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
  }

  function test_revertWith_setFeatureCondition_invalidThreshold()
    external
    givenTokensAreMinted(deployer, TEST_THRESHOLD - 10 ether)
  {
    FeatureManager.Condition memory condition = FeatureManager.Condition({
      token: address(townsToken),
      threshold: TEST_THRESHOLD,
      active: true,
      extraData: ""
    });

    vm.prank(deployer);
    vm.expectRevert(InvalidThreshold.selector);
    featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
  }

  function test_disableFeatureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition,
    address to,
    uint256 amount
  ) external givenFeatureConditionIsSet(featureId, condition, to, amount) {
    vm.assume(condition.active == true);

    vm.prank(deployer);
    vm.expectEmit(address(featureManagerFacet));
    emit FeatureConditionDisabled(featureId);
    featureManagerFacet.disableFeatureCondition(featureId);

    FeatureManager.Condition memory currentCondition = featureManagerFacet
      .getFeatureCondition(featureId);
    assertFalse(currentCondition.active);
  }

  function test_revertWith_disableFeatureCondition_featureNotActive() external {
    vm.prank(deployer);
    vm.expectRevert(FeatureNotActive.selector);
    featureManagerFacet.disableFeatureCondition(TEST_FEATURE_ID);
  }

  function test_checkFeatureCondition(
    bytes32 featureId,
    FeatureManager.Condition memory condition,
    address to,
    uint256 amount,
    address space
  ) external givenFeatureConditionIsSet(featureId, condition, to, amount) {
    vm.assume(condition.active == true);
    vm.assume(space != address(0));

    vm.assertFalse(featureManagerFacet.checkFeatureCondition(featureId, space));

    vm.prank(to);
    towns.delegate(space);

    vm.assertTrue(featureManagerFacet.checkFeatureCondition(featureId, space));
  }

  function test_checkFeatureCondition_featureNotActive(
    address space
  ) external view {
    vm.assume(space != address(0));
    vm.assertFalse(
      featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space)
    );
  }

  function test_checkFeatureCondition_noThreshold(address space) external {
    vm.assume(space != address(0));

    FeatureManager.Condition memory condition = FeatureManager.Condition({
      token: address(townsToken),
      threshold: 0,
      active: true,
      extraData: ""
    });

    vm.prank(bridge);
    towns.mint(deployer, TEST_THRESHOLD);

    vm.prank(deployer);
    featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);

    vm.assertTrue(
      featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space)
    );
  }
}
