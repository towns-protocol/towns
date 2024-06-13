// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "contracts/src/tokens/river/mainnet/delegation/ICrossDomainMessenger.sol";

// libraries

// contracts
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {MainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/MainnetDelegationBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract MainnetDelegation is
  IMainnetDelegation,
  MainnetDelegationBase,
  OwnableBase,
  Facet
{
  // =============================================================
  //                           Initializers
  // =============================================================
  function __MainnetDelegation_init(
    address messenger
  ) external onlyInitializing {
    __MainnetDelegation_init_unchained(messenger);
  }

  function __MainnetDelegation_init_unchained(address messenger) internal {
    _addInterface(type(IMainnetDelegation).interfaceId);
    _setMessenger(ICrossDomainMessenger(messenger));
  }

  // =============================================================
  //                           Modifiers
  // =============================================================
  modifier onlyCrossDomainMessenger() {
    ICrossDomainMessenger messenger = _getMessenger();

    require(
      msg.sender == address(messenger) &&
        messenger.xDomainMessageSender() == address(_getProxyDelegation()),
      "MainnetDelegation: sender is not the cross-domain messenger"
    );
    _;
  }

  // =============================================================
  //                           Getters
  // =============================================================
  function getMessenger() external view returns (address) {
    return address(_getMessenger());
  }

  function getProxyDelegation() external view returns (address) {
    return address(_getProxyDelegation());
  }

  // =============================================================
  //                  Batch Authorized Claimers
  // =============================================================
  function setBatchAuthorizedClaimers(
    address[] calldata delegators,
    address[] calldata claimers
  ) external onlyCrossDomainMessenger {
    uint256 delegatorsLen = delegators.length;
    for (uint256 i; i < delegatorsLen; i++) {
      _setAuthorizedClaimer(delegators[i], claimers[i]);
    }
  }

  // =============================================================
  //                           Batch Delegation
  // =============================================================
  function setBatchDelegation(
    address[] calldata delegators,
    address[] calldata delegates,
    address[] calldata claimers,
    uint256[] calldata quantities
  ) external onlyCrossDomainMessenger {
    uint256 delegatorsLen = delegators.length;
    for (uint256 i; i < delegatorsLen; i++) {
      _replaceDelegation(
        delegators[i],
        claimers[i],
        delegates[i],
        quantities[i]
      );
    }
  }

  // =============================================================
  //                           Delegation
  // =============================================================
  function setProxyDelegation(address proxyDelegation) external onlyOwner {
    _setProxyDelegation(proxyDelegation);
  }

  /// @inheritdoc IMainnetDelegation
  function setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) external onlyCrossDomainMessenger {
    _setDelegation(delegator, operator, quantity);
  }

  /// @inheritdoc IMainnetDelegation
  function getDelegationByDelegator(
    address delegator
  ) external view returns (Delegation memory) {
    return _getDelegationByDelegator(delegator);
  }

  /// @inheritdoc IMainnetDelegation
  function getMainnetDelegationsByOperator(
    address operator
  ) external view returns (Delegation[] memory) {
    return _getMainnetDelegationsByOperator(operator);
  }

  /// @inheritdoc IMainnetDelegation
  function getDelegatedStakeByOperator(
    address operator
  ) external view returns (uint256) {
    return _getDelegatedStakeByOperator(operator);
  }

  // =============================================================
  //                           Claimer
  // =============================================================
  function setAuthorizedClaimer(
    address owner,
    address claimer
  ) external onlyCrossDomainMessenger {
    _setAuthorizedClaimer(owner, claimer);
  }

  function getAuthorizedClaimer(address owner) external view returns (address) {
    return _getAuthorizedClaimer(owner);
  }
}
