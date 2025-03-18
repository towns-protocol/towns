// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureManager} from "contracts/src/base/registry/facets/feature/FeatureManager.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {FeatureFacet} from "contracts/src/base/registry/facets/feature/FeatureFacet.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";

contract FeatureManagerTest is BaseSetup {
  FeatureFacet featureFacet;
  Towns towns;

  bytes32 constant TEST_FEATURE_ID = keccak256("test.feature");
  uint256 constant TEST_THRESHOLD = 100 ether;

  function setUp() public override {
    super.setUp();
    featureFacet = FeatureFacet(baseRegistry);
    towns = Towns(townsToken);
  }

  modifier givenFeatureConditionIsSet(
    uint256 threshold,
    bytes32 featureId,
    uint256 amount,
    address to
  ) {
    FeatureManager.Condition memory condition = FeatureManager.Condition({
      token: address(townsToken),
      threshold: threshold,
      active: true,
      extraData: ""
    });

    vm.prank(bridge);
    towns.mint(to, amount);

    vm.prank(deployer);
    featureFacet.setFeatureCondition(featureId, condition);
    _;
  }

  modifier givenTokensAreMinted(uint256 amount, address to) {
    vm.prank(bridge);
    towns.mint(to, amount);
    _;
  }

  function test_setFeatureCondition()
    external
    givenFeatureConditionIsSet(
      TEST_THRESHOLD,
      TEST_FEATURE_ID,
      TEST_THRESHOLD,
      deployer
    )
  {
    FeatureManager.Condition memory condition = featureFacet
      .getFeatureCondition(TEST_FEATURE_ID);
    assertEq(
      condition.threshold,
      TEST_THRESHOLD,
      "Threshold should be 100 ether"
    );
    assertEq(condition.active, true, "Feature should be active");
  }

  function test_checkFeatureCondition(
    address to
  )
    external
    givenFeatureConditionIsSet(
      TEST_THRESHOLD,
      TEST_FEATURE_ID,
      TEST_THRESHOLD,
      to
    )
  {
    bool isFeatureActive = featureFacet.checkFeatureCondition(
      TEST_FEATURE_ID,
      everyoneSpace
    );
    assertFalse(isFeatureActive, "Feature should not be active");

    vm.prank(to);
    towns.delegate(address(everyoneSpace));

    isFeatureActive = featureFacet.checkFeatureCondition(
      TEST_FEATURE_ID,
      everyoneSpace
    );

    assertTrue(isFeatureActive, "Feature should be active");
  }
}
