// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5805} from "contracts/src/diamond/facets/governance/votes/IERC5805.sol";

// libraries
import {VotesStorage} from "contracts/src/diamond/facets/governance/votes/VotesStorage.sol";
import {Checkpoints} from "contracts/src/diamond/facets/governance/votes/Checkpoints.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// contracts
import {Nonces} from "contracts/src/diamond/utils/Nonces.sol";
import {EIP712} from "contracts/src/diamond/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract ERC20Votes is IERC5805, EIP712, Nonces {
  using VotesStorage for VotesStorage.Layout;
  using Checkpoints for Checkpoints.Trace224;

  // keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");
  bytes32 private constant _DELEGATION_TYPEHASH =
    0xe48329057bfd03d55e49b547132e39cffd9c1820ad7b9d4c5307691425d15adf;

  // =============================================================
  //                           ERC 5805
  // =============================================================

  function clock() public view virtual override returns (uint48) {
    return SafeCast.toUint48(block.timestamp);
  }

  function CLOCK_MODE() public view virtual override returns (string memory) {
    // Check that the clock was not modified
    require(clock() == block.number, "Votes: broken clock mode");
    return "mode=blocknumber&from=default";
  }

  // =============================================================
  //                           Votes
  // =============================================================

  function getVotes(
    address account
  ) public view virtual override returns (uint256) {
    return VotesStorage.layout()._delegateCheckpoints[account].latest();
  }

  function getPastVotes(
    address account,
    uint256 timepoint
  ) public view virtual override returns (uint256) {
    require(timepoint < clock(), "Votes: future lookup");
    return
      VotesStorage.layout()._delegateCheckpoints[account].upperLookupRecent(
        SafeCast.toUint32(timepoint)
      );
  }

  function getPastTotalSupply(
    uint256 timepoint
  ) public view virtual override returns (uint256) {
    require(timepoint < clock(), "Votes: future lookup");
    return
      VotesStorage.layout()._totalCheckpoints.upperLookupRecent(
        SafeCast.toUint32(timepoint)
      );
  }

  function delegates(
    address account
  ) public view virtual override returns (address) {
    return VotesStorage.layout()._delegation[account];
  }

  function delegate(address delegatee) public virtual override {
    address account = msg.sender;
    _delegate(account, delegatee);
  }

  function delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public virtual override {
    require(block.timestamp <= expiry, "Votes: signature expired");

    bytes32 hashed = _hashTypedDataV4(
      keccak256(abi.encode(_DELEGATION_TYPEHASH, delegatee, nonce, expiry))
    );

    address signer = ECDSA.recover(hashed, v, r, s);

    _useCheckedNonce(signer, nonce);
    _delegate(signer, delegatee);
  }

  // =============================================================
  //                           Hooks
  // =============================================================
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
    address oldDelegate = delegates(account);
    VotesStorage.layout()._delegation[account] = delegatee;

    emit DelegateChanged(account, oldDelegate, delegatee);
    _moveDelegateVotes(oldDelegate, delegatee, _getVotingUnits(account));
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
    _moveDelegateVotes(delegates(from), delegates(to), amount);
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
    return store.push(SafeCast.toUint32(clock()), op(store.latest(), delta));
  }

  function _add(uint224 a, uint224 b) private pure returns (uint224) {
    return a + b;
  }

  function _subtract(uint224 a, uint224 b) private pure returns (uint224) {
    return a - b;
  }
}
