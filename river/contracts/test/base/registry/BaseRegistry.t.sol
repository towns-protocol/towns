// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "@river-build/diamond/src/facets/ownable/IERC173.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";

// libraries
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {StakingRewards} from "contracts/src/base/registry/facets/distribution/v2/StakingRewards.sol";
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {EIP712Facet} from "@river-build/diamond/src/utils/cryptography/signature/EIP712Facet.sol";
import {NodeOperatorFacet} from "contracts/src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {Towns} from "contracts/src/tokens/towns/base/Towns.sol";
import {MainnetDelegation} from "contracts/src/base/registry/facets/mainnet/MainnetDelegation.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";
import {RewardsDistribution} from "contracts/src/base/registry/facets/distribution/v2/RewardsDistribution.sol";
import {RewardsVerifier} from "./RewardsVerifier.t.sol";

abstract contract BaseRegistryTest is RewardsVerifier, BaseSetup {
  using FixedPointMathLib for uint256;

  uint256 internal constant REASONABLE_TOKEN_SUPPLY = 1e38;

  NodeOperatorFacet internal operatorFacet;
  MainnetDelegation internal mainnetDelegationFacet;
  SpaceDelegationFacet internal spaceDelegationFacet;

  address internal OPERATOR = makeAddr("OPERATOR");
  address internal NOTIFIER = makeAddr("NOTIFIER");
  uint256 internal rewardDuration;
  uint96 internal totalStaked;

  function setUp() public virtual override {
    super.setUp();

    eip712Facet = EIP712Facet(baseRegistry);
    operatorFacet = NodeOperatorFacet(baseRegistry);
    towns = Towns(townsToken);
    mainnetDelegationFacet = MainnetDelegation(baseRegistry);
    rewardsDistributionFacet = RewardsDistribution(baseRegistry);
    spaceDelegationFacet = SpaceDelegationFacet(baseRegistry);

    messenger.setXDomainMessageSender(mainnetProxyDelegation);

    vm.prank(deployer);
    rewardsDistributionFacet.setRewardNotifier(NOTIFIER, true);
    setOperator(OPERATOR, 0);

    rewardDuration = rewardsDistributionFacet.stakingState().rewardDuration;

    vm.label(baseRegistry, "BaseRegistry");
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          OPERATOR                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  modifier givenOperator(address operator, uint256 commissionRate) {
    if (operator != OPERATOR) {
      setOperator(operator, commissionRate);
    } else {
      resetOperatorCommissionRate(operator, commissionRate);
    }
    _;
  }

  function setOperator(address operator, uint256 commissionRate) internal {
    registerOperator(operator);
    setOperatorCommissionRate(operator, commissionRate);
    setOperatorStatus(operator, NodeOperatorStatus.Approved);
    setOperatorStatus(operator, NodeOperatorStatus.Active);
  }

  function registerOperator(address operator) internal {
    vm.assume(operator != address(0));
    if (!operatorFacet.isOperator(operator)) {
      vm.prank(operator);
      operatorFacet.registerOperator(operator);
    }
  }

  function setOperatorCommissionRate(
    address operator,
    uint256 commissionRate
  ) internal {
    commissionRate = bound(commissionRate, 0, 10000);
    vm.prank(operator);
    operatorFacet.setCommissionRate(commissionRate);
  }

  function setOperatorClaimAddress(address operator, address claimer) internal {
    vm.assume(claimer != address(0));
    vm.assume(claimer != operator);
    vm.prank(operator);
    operatorFacet.setClaimAddressForOperator(claimer, operator);
  }

  function setOperatorStatus(
    address operator,
    NodeOperatorStatus newStatus
  ) internal {
    vm.prank(deployer);
    operatorFacet.setOperatorStatus(operator, newStatus);
  }

  function resetOperatorCommissionRate(
    address operator,
    uint256 commissionRate
  ) internal {
    setOperatorStatus(operator, NodeOperatorStatus.Exiting);
    setOperatorStatus(operator, NodeOperatorStatus.Standby);
    setOperatorCommissionRate(operator, commissionRate);
    setOperatorStatus(operator, NodeOperatorStatus.Approved);
    setOperatorStatus(operator, NodeOperatorStatus.Active);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           SPACE                            */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function deploySpace(address _deployer) internal returns (address _space) {
    IArchitectBase.SpaceInfo memory spaceInfo = _createSpaceInfo(
      string(abi.encode(_randomUint256()))
    );
    spaceInfo.membership.settings.pricingModule = pricingModule;
    vm.prank(_deployer);
    _space = ICreateSpace(spaceFactory).createSpace(spaceInfo);
    space = _space;
  }

  modifier givenSpaceIsDeployed() {
    deploySpace(deployer);
    _;
  }

  function pointSpaceToOperator(address space, address operator) internal {
    vm.assume(space != address(0));
    vm.assume(operator != address(0));
    vm.assume(space != operator);
    vm.prank(IERC173(space).owner());
    spaceDelegationFacet.addSpaceDelegation(space, operator);
  }

  modifier givenSpaceHasPointedToOperator(address space, address operator) {
    pointSpaceToOperator(space, operator);
    _;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           HELPER                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function boundReward(uint256 reward) internal view returns (uint256) {
    return
      bound(
        reward,
        rewardDuration,
        FixedPointMathLib.min(
          rewardDuration.fullMulDiv(
            type(uint256).max,
            StakingRewards.SCALE_FACTOR
          ),
          REASONABLE_TOKEN_SUPPLY
        )
      );
  }

  function sanitizeAmounts(uint256[32] memory amounts) internal {
    uint256 len = amounts.length;
    for (uint256 i; i < len; ++i) {
      vm.assume(totalStaked < type(uint96).max);
      amounts[i] = bound(amounts[i], 1, type(uint96).max - totalStaked);
      totalStaked += uint96(amounts[i]);
    }
  }

  function sanitizeAmounts(uint256[] memory amounts) internal {
    uint256 len = amounts.length;
    for (uint256 i; i < len; ++i) {
      vm.assume(totalStaked < type(uint96).max);
      amounts[i] = bound(amounts[i], 1, type(uint96).max - totalStaked);
      totalStaked += uint96(amounts[i]);
    }
  }

  function toDyn(
    address[32] memory arr
  ) internal returns (address[] memory res) {
    assembly ("memory-safe") {
      res := mload(0x40)
      mstore(0x40, add(res, mul(33, 0x20)))
      mstore(res, 32)
      pop(
        call(gas(), 0x04, 0, arr, mul(32, 0x20), add(res, 0x20), mul(32, 0x20))
      )
    }
  }

  function toDyn(
    uint256[32] memory arr
  ) internal returns (uint256[] memory res) {
    assembly ("memory-safe") {
      res := mload(0x40)
      mstore(0x40, add(res, mul(33, 0x20)))
      mstore(res, 32)
      pop(
        call(gas(), 0x04, 0, arr, mul(32, 0x20), add(res, 0x20), mul(32, 0x20))
      )
    }
  }

  function bridgeTokensForUser(address user, uint256 amount) internal {
    vm.assume(user != address(0));
    vm.prank(bridge);
    towns.mint(user, amount);
  }
}
