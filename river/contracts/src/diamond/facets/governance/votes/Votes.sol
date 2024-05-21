// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6372} from "./IERC6372.sol";
import {IVotes} from "./IVotes.sol";

// contracts
import {VotesBase} from "./VotesBase.sol";

abstract contract Votes is VotesBase {
  /// @inheritdoc IERC6372
  function clock() public view virtual returns (uint48) {
    return _clock();
  }

  /// @inheritdoc IERC6372
  function CLOCK_MODE() public view virtual returns (string memory) {
    return _clockMode();
  }

  /// @inheritdoc IVotes
  function getVotes(address account) public view virtual returns (uint256) {
    return _getVotes(account);
  }

  /// @inheritdoc IVotes
  function getPastVotes(
    address account,
    uint256 timepoint
  ) public view virtual returns (uint256) {
    return _getPastVotes(account, timepoint);
  }

  /// @inheritdoc IVotes
  function getPastTotalSupply(
    uint256 timepoint
  ) public view virtual returns (uint256) {
    return _getPastTotalSupply(timepoint);
  }

  /// @inheritdoc IVotes
  function delegates(address account) public view virtual returns (address) {
    return _delegates(account);
  }

  /// @inheritdoc IVotes
  function delegate(address delegatee) public virtual {
    _delegate(msg.sender, delegatee);
  }

  /// @inheritdoc IVotes
  function delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public virtual {
    return _delegateBySig(delegatee, nonce, expiry, v, r, s);
  }
}
