// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces
import {ISpace} from "contracts/src/spaces/interfaces/ISpace.sol";
import {IVotingVault} from "council/interfaces/IVotingVault.sol";

// libraries

// contracts
import {StakingVault} from "contracts/src/governance/vaults/StakingVault.sol";

contract StakingFactory is IVotingVault {
  error AlreadyRegistered(address _town);
  error NotRegistered(address _town);
  error NotOwner(address _owner);

  event Registered(address _stakingContract);

  address public rewardsToken;
  address public stakingToken;
  address public rewardsDuration;

  // town => staking contract
  mapping(address => address) public stakingContracts;

  address[] public towns;

  constructor(
    address _stakingToken,
    address _rewardsToken,
    address _rewardsDuration
  ) {
    stakingToken = _stakingToken;
    rewardsToken = _rewardsToken;
    rewardsDuration = _rewardsDuration;
  }

  function register(address _town) external {
    if (stakingContracts[_town] != address(0)) revert AlreadyRegistered(_town);
    if (msg.sender != ISpace(_town).owner()) revert NotOwner(msg.sender);

    stakingContracts[_town] = address(
      new StakingVault(_town, stakingToken, rewardsToken, 7 days)
    );
    towns.push(_town);

    emit Registered(stakingContracts[_town]);
  }

  function queryVotePower(
    address user,
    uint256,
    bytes calldata extraData
  ) external view returns (uint256) {
    address town = abi.decode(extraData, (address));

    if (stakingContracts[town] == address(0)) revert NotRegistered(town);

    if (ISpace(town).owner() != user) return 0;

    return StakingVault(stakingContracts[town]).stakingTokenBalance();
  }
}
