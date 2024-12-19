// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IVotesEnumerable} from "contracts/src/diamond/facets/governance/votes/enumerable/IVotesEnumerable.sol";
import {IAuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/IAuthorizedClaimers.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "./ICrossDomainMessenger.sol";
import {IProxyBatchDelegation} from "./IProxyBatchDelegation.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts

contract ProxyBatchDelegation is IProxyBatchDelegation {
  address public immutable MESSENGER;
  address public immutable TARGET;

  address public immutable RIVER;
  IAuthorizedClaimers public immutable CLAIMERS;

  constructor(
    address _rvr,
    address _claimers,
    address _messenger,
    address _target
  ) {
    RIVER = _rvr;
    CLAIMERS = IAuthorizedClaimers(_claimers);
    MESSENGER = _messenger;
    TARGET = _target;
  }

  function sendAuthorizedClaimers(uint32 minGasLimit) external {
    address[] memory delegators = IVotesEnumerable(RIVER).getDelegators();
    uint256 length = delegators.length;
    address[] memory authorizedClaimers = new address[](length);

    for (uint256 i; i < length; ++i) {
      authorizedClaimers[i] = CLAIMERS.getAuthorizedClaimer(delegators[i]);
    }

    ICrossDomainMessenger(MESSENGER).sendMessage(
      TARGET,
      abi.encodeCall(
        IMainnetDelegation.setBatchAuthorizedClaimers,
        (delegators, authorizedClaimers)
      ),
      minGasLimit
    );
  }

  function sendDelegators(uint32 minGasLimit, bool firstHalf) external {
    address[] memory allDelegators = IVotesEnumerable(RIVER).getDelegators();
    uint256 start;
    uint256 end;
    {
      uint256 length = allDelegators.length;
      uint256 halfLength = length >> 1;
      (start, end) = firstHalf ? (0, halfLength) : (halfLength, length);
    }
    uint256 sliceLength = end - start;

    address[] memory delegators = new address[](sliceLength);
    address[] memory delegates = new address[](sliceLength);
    address[] memory authorizedClaimers = new address[](sliceLength);
    uint256[] memory quantities = new uint256[](sliceLength);

    // Use a separate array index to avoid out-of-range issues
    uint256 arrayIndex = 0;
    for (uint256 i = start; i < end; ++i) {
      address delegator = allDelegators[i];
      delegators[arrayIndex] = delegator;
      authorizedClaimers[arrayIndex] = CLAIMERS.getAuthorizedClaimer(delegator);
      delegates[arrayIndex] = _delegates(RIVER, delegator);
      quantities[arrayIndex] = SafeTransferLib.balanceOf(RIVER, delegator);
      ++arrayIndex;
    }

    ICrossDomainMessenger(MESSENGER).sendMessage(
      TARGET,
      abi.encodeCall(
        IMainnetDelegation.setBatchDelegation,
        (delegators, delegates, authorizedClaimers, quantities)
      ),
      minGasLimit
    );
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
