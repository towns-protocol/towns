// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5805} from "./IERC5805.sol";

// libraries
import {VotesStorage} from "./VotesStorage.sol";
import {Checkpoints} from "./Checkpoints.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// contracts
import {Nonces} from "contracts/src/diamond/utils/Nonces.sol";
import {Context} from "contracts/src/diamond/utils/Context.sol";
import {EIP712} from "contracts/src/diamond/utils/cryptography/EIP712.sol";

/**
 * @dev This is a base abstract contract that tracks voting units, which are a measure of voting power that can be
 * transferred, and provides a system of vote delegation, where an account can delegate its voting units to a sort of
 * "representative" that will pool delegated voting units from different accounts and can then use it to vote in
 * decisions. In fact, voting units _must_ be delegated in order to count as actual votes, and an account has to
 * delegate those votes to itself if it wishes to participate in decisions and does not have a trusted representative.
 *
 * This contract is often combined with a token contract such that voting units correspond to token units. For an
 * example, see {ERC721Votes}.
 *
 * The full history of delegate votes is tracked on-chain so that governance protocols can consider votes as distributed
 * at a particular block number to protect against flash loans and double voting. The opt-in delegate system makes the
 * cost of this history tracking optional.
 *
 * When using this module the derived contract must implement {_getVotingUnits} (for example, make it return
 * {ERC721-balanceOf}), and can use {_transferVotingUnits} to track a change in the distribution of those units (in the
 * previous example, it would be included in {ERC721-_beforeTokenTransfer}).
 *
 */
abstract contract VotesBase is IERC5805, Context, EIP712, Nonces {
  using VotesStorage for VotesStorage.Layout;
  using Checkpoints for Checkpoints.Trace224;

  // =============================================================
  //                         EIP 712
  // =============================================================

  bytes32 private constant _DELEGATION_TYPEHASH =
    keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

  // =============================================================
  //                           ERC 5805
  // =============================================================

  /**
   * @dev Clock used for flagging checkpoints. Can be overridden to implement timestamp based
   * checkpoints (and voting), in which case {CLOCK_MODE} should be overridden as well to match.
   */
  function _clock() internal view returns (uint48) {
    return SafeCast.toUint48(block.number);
  }

  /**
   * @dev Machine-readable description of the clock as specified in EIP-6372.
   */
  // solhint-disable-next-line func-name-mixedcase
  function _clockMode() internal view returns (string memory) {
    // Check that the clock was not modified
    require(_clock() == block.number, "Votes: broken clock mode");
    return "mode=blocknumber&from=default";
  }

  // =============================================================
  //                           Votes
  // =============================================================

  /**
   * @dev Returns the current amount of votes that `account` has.
   */
  function _getVotes(address account) internal view returns (uint256) {
    return VotesStorage.layout()._delegateCheckpoints[account].latest();
  }

  /**
   * @dev Returns the amount of votes that `account` had at a specific moment in the past. If the `clock()` is
   * configured to use block numbers, this will return the value at the end of the corresponding block.
   *
   * Requirements:
   *
   * - `timepoint` must be in the past. If operating using block numbers, the block must be already mined.
   */
  function _getPastVotes(
    address account,
    uint256 timepoint
  ) internal view returns (uint256) {
    require(timepoint < _clock(), "Votes: future lookup");
    return
      VotesStorage.layout()._delegateCheckpoints[account].upperLookupRecent(
        SafeCast.toUint32(timepoint)
      );
  }

  /**
   * @dev Returns the total supply of votes available at a specific moment in the past. If the `clock()` is
   * configured to use block numbers, this will return the value at the end of the corresponding block.
   *
   * NOTE: This value is the sum of all available votes, which is not necessarily the sum of all delegated votes.
   * Votes that have not been delegated are still part of total supply, even though they would not participate in a
   * vote.
   *
   * Requirements:
   *
   * - `timepoint` must be in the past. If operating using block numbers, the block must be already mined.
   */
  function _getPastTotalSupply(
    uint256 timepoint
  ) internal view returns (uint256) {
    require(timepoint < _clock(), "Votes: future lookup");
    return
      VotesStorage.layout()._totalCheckpoints.upperLookupRecent(
        SafeCast.toUint32(timepoint)
      );
  }

  /**
   * @dev Returns the delegate that `account` has chosen.
   */
  function _delegates(address account) internal view returns (address) {
    return VotesStorage.layout()._delegation[account];
  }

  /**
   * @dev Delegates votes from signer to `delegatee`.
   */
  function _delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal {
    require(block.timestamp <= expiry, "Votes: signature expired");
    address signer = ECDSA.recover(
      _hashTypedDataV4(
        keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))
      ),
      v,
      r,
      s
    );

    _useCheckedNonce(signer, nonce);
    _delegate(signer, delegatee);
  }

  /**
   * @dev Must return the voting units held by an account.
   */
  function _getVotingUnits(address) internal view virtual returns (uint256);

  // =============================================================
  //                           Internal
  // =============================================================

  /**
   * @dev Returns the current total supply of votes.
   */
  function _getTotalSupply() internal view virtual returns (uint256) {
    return VotesStorage.layout()._totalCheckpoints.latest();
  }

  /**
   * @dev Delegate all of `account`'s voting units to `delegatee`.
   *
   * Emits events {IVotes-DelegateChanged} and {IVotes-DelegateVotesChanged}.
   */
  function _delegate(address account, address delegatee) internal virtual {
    _beforeDelegate(account, delegatee);

    address oldDelegate = _delegates(account);
    VotesStorage.layout()._delegation[account] = delegatee;

    emit DelegateChanged(account, oldDelegate, delegatee);
    _moveDelegateVotes(oldDelegate, delegatee, _getVotingUnits(account));

    _afterDelegate(account, delegatee);
  }

  /**
   * @dev Transfers, mints, or burns voting units. To register a mint, `from` should be zero. To register a burn, `to`
   * should be zero. Total supply of voting units will be adjusted with mints and burns.
   */
  function _transferVotingUnits(
    address from,
    address to,
    uint256 amount
  ) internal virtual {
    if (from == address(0)) {
      _push(
        VotesStorage.layout()._totalCheckpoints,
        _add,
        SafeCast.toUint224(amount)
      );
    }
    if (to == address(0)) {
      _push(
        VotesStorage.layout()._totalCheckpoints,
        _subtract,
        SafeCast.toUint224(amount)
      );
    }
    _moveDelegateVotes(_delegates(from), _delegates(to), amount);
  }

  /**
   * @dev Moves delegated votes from one delegate to another.
   */
  function _moveDelegateVotes(
    address from,
    address to,
    uint256 amount
  ) private {
    if (from != to && amount > 0) {
      if (from != address(0)) {
        (uint256 oldValue, uint256 newValue) = _push(
          VotesStorage.layout()._delegateCheckpoints[from],
          _subtract,
          SafeCast.toUint224(amount)
        );
        emit DelegateVotesChanged(from, oldValue, newValue);
      }
      if (to != address(0)) {
        (uint256 oldValue, uint256 newValue) = _push(
          VotesStorage.layout()._delegateCheckpoints[to],
          _add,
          SafeCast.toUint224(amount)
        );
        emit DelegateVotesChanged(to, oldValue, newValue);
      }
    }
  }

  function _push(
    Checkpoints.Trace224 storage store,
    function(uint224, uint224) view returns (uint224) op,
    uint224 delta
  ) private returns (uint224, uint224) {
    return store.push(SafeCast.toUint32(_clock()), op(store.latest(), delta));
  }

  function _add(uint224 a, uint224 b) private pure returns (uint224) {
    return a + b;
  }

  function _subtract(uint224 a, uint224 b) private pure returns (uint224) {
    return a - b;
  }

  /**
   * @dev Hook that is called before any delegate operation. This includes {delegate} and {delegateBySig}.
   * @param signer The account that signs the delegation.
   * @param delegatee The account that will be delegated to.
   */
  function _beforeDelegate(
    address signer,
    address delegatee
  ) internal virtual {}

  /**
   * @dev Hook that is called after any delegate operation. This includes {delegate} and {delegateBySig}.
   * @param account The account that has been delegated.
   * @param delegatee The account that has been delegated to.
   */
  function _afterDelegate(
    address account,
    address delegatee
  ) internal virtual {}
}
