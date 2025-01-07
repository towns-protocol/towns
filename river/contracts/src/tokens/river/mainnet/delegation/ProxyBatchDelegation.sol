// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";
import {IAuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/IAuthorizedClaimers.sol";
import {IMainnetDelegationBase, IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "./ICrossDomainMessenger.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts

contract ProxyBatchDelegation is IMainnetDelegationBase {
  using SafeTransferLib for address;

  address public immutable MESSENGER;
  address public immutable BASE_REGISTRY;

  address public immutable RIVER;
  address public immutable CLAIMER_MANAGER;

  constructor(
    address _rvr,
    address _claimers,
    address _messenger,
    address _target
  ) {
    RIVER = _rvr;
    CLAIMER_MANAGER = _claimers;
    MESSENGER = _messenger;
    BASE_REGISTRY = _target;
  }

  function relayDelegationDigest(uint32 minGasLimit) external {
    DelegationMsg[] memory msgs = _getDelegationMsgs();
    bytes32 digest = _digest(msgs);

    ICrossDomainMessenger(MESSENGER).sendMessage(
      BASE_REGISTRY,
      abi.encodeCall(IMainnetDelegation.setDelegationDigest, digest),
      minGasLimit
    );
  }

  function getEncodedMsgs() external view returns (bytes memory encodedMsgs) {
    DelegationMsg[] memory msgs = _getDelegationMsgs();
    encodedMsgs = abi.encode(msgs);
  }

  /// @dev Generates the digest of the delegation messages
  function _digest(
    DelegationMsg[] memory msgs
  ) internal pure returns (bytes32 digest) {
    digest = keccak256(abi.encode(keccak256(abi.encode(msgs))));
  }

  /// @dev Gathers the delegation messages
  function _getDelegationMsgs()
    internal
    view
    returns (DelegationMsg[] memory msgs)
  {
    address[] memory allDelegators = IVotesEnumerable(RIVER).getDelegators();
    uint256 length = allDelegators.length;
    msgs = new DelegationMsg[](length);

    for (uint256 i; i < length; ++i) {
      address delegator = allDelegators[i];
      msgs[i].delegator = delegator;
      msgs[i].delegatee = _delegates(RIVER, delegator);
      msgs[i].quantity = RIVER.balanceOf(delegator);
      msgs[i].claimer = IAuthorizedClaimers(CLAIMER_MANAGER)
        .getAuthorizedClaimer(delegator);
    }
  }

  /// @dev Returns the delegate that `account` has chosen.
  /// Returns zero if the `token` does not exist.
  function _delegates(
    address token,
    address account
  ) internal view returns (address delegatee) {
    /// @solidity memory-safe-assembly
    assembly {
      mstore(0x14, account) // Store the `account` argument.
      mstore(0x00, 0x587cde1e000000000000000000000000) // `delegates(address)`.
      delegatee := mul(
        // The arguments of `mul` are evaluated from right to left.
        mload(0x20),
        and(
          // The arguments of `and` are evaluated from right to left.
          gt(returndatasize(), 0x1f), // At least 32 bytes returned.
          staticcall(gas(), token, 0x10, 0x24, 0x20, 0x20)
        )
      )
    }
  }
}
