// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ICrossDomainMessenger} from "./ICrossDomainMessenger.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {IProxyBatchDelegation} from "./IProxyBatchDelegation.sol";

// libraries
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {River} from "contracts/src/tokens/river/mainnet/River.sol";
import {AuthorizedClaimers} from "contracts/src/tokens/river/mainnet/claimer/AuthorizedClaimers.sol";

contract ProxyBatchDelegation is IProxyBatchDelegation {
  address public immutable MESSENGER;
  address public immutable TARGET;

  River internal immutable rvr;
  AuthorizedClaimers internal immutable claimers;

  constructor(
    address _rvr,
    address _claimers,
    address _messenger,
    address _target
  ) {
    rvr = River(_rvr);
    claimers = AuthorizedClaimers(_claimers);

    MESSENGER = _messenger;
    TARGET = _target;
  }

  function sendAuthorizedClaimers(uint32 minGasLimit) external {
    address[] memory delegators = rvr.getDelegators();
    uint256 length = delegators.length;
    address[] memory authorizedClaimers = new address[](length);

    for (uint256 i; i < length; ++i) {
      authorizedClaimers[i] = claimers.getAuthorizedClaimer(delegators[i]);
    }

    ICrossDomainMessenger(MESSENGER).sendMessage(
      TARGET,
      abi.encodeWithSelector(
        IMainnetDelegation.setBatchAuthorizedClaimers.selector,
        delegators,
        authorizedClaimers
      ),
      minGasLimit
    );
  }

  function sendDelegators(uint32 minGasLimit) external {
    address[] memory delegators = rvr.getDelegators();
    uint256 length = delegators.length;
    address[] memory delegates = new address[](length);
    address[] memory authorizedClaimers = new address[](length);
    uint256[] memory quantities = new uint256[](length);

    for (uint256 i; i < length; ++i) {
      address delegator = delegators[i];
      authorizedClaimers[i] = claimers.getAuthorizedClaimer(delegator);
      delegates[i] = _delegates(address(rvr), delegator);
      quantities[i] = SafeTransferLib.balanceOf(address(rvr), delegator);
    }

    ICrossDomainMessenger(MESSENGER).sendMessage(
      TARGET,
      abi.encodeWithSelector(
        IMainnetDelegation.setBatchDelegation.selector,
        delegators,
        delegates,
        authorizedClaimers,
        quantities
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
