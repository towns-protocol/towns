// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {AggregatorV3Interface} from "contracts/src/utils/interfaces/AggregatorV3Interface.sol";

// libraries

// contracts

contract MockAggregatorV3 is AggregatorV3Interface {
  uint8 public override decimals;
  string public override description;
  uint256 public override version;

  uint80 public roundId;
  int256 public answer;
  uint256 public startedAt;
  uint256 public updatedAt;
  uint80 public answeredInRound;

  constructor(uint8 _decimals, string memory _description, uint256 _version) {
    decimals = _decimals;
    description = _description;
    version = _version;
  }

  function setRoundData(
    uint80 _roundId,
    int256 _answer,
    uint256 _startedAt,
    uint256 _updatedAt,
    uint80 _answeredInRound
  ) external {
    roundId = _roundId;
    answer = _answer;
    startedAt = _startedAt;
    updatedAt = _updatedAt;
    answeredInRound = _answeredInRound;
  }

  function getRoundData(
    uint80
  ) external view override returns (uint80, int256, uint256, uint256, uint80) {
    return (roundId, answer, startedAt, updatedAt, answeredInRound);
  }

  function latestRoundData()
    external
    view
    override
    returns (uint80, int256, uint256, uint256, uint80)
  {
    return (roundId, answer, startedAt, updatedAt, answeredInRound);
  }
}
