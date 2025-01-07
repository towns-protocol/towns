// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {ICrossDomainMessenger} from "contracts/src/tokens/river/mainnet/delegation/ICrossDomainMessenger.sol";

// libraries

// contracts
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";
import {MainnetDelegationBase} from "contracts/src/tokens/river/base/delegation/MainnetDelegationBase.sol";
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";

contract MainnetDelegation is
  IMainnetDelegation,
  MainnetDelegationBase,
  OwnableBase,
  Facet
{
  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                        INITIALIZERS                        */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function __MainnetDelegation_init(
    address messenger
  ) external onlyInitializing {
    __MainnetDelegation_init_unchained(messenger);
  }

  function __MainnetDelegation_init_unchained(address messenger) internal {
    _addInterface(type(IMainnetDelegation).interfaceId);
    _setMessenger(ICrossDomainMessenger(messenger));
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          MODIFIER                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  modifier onlyCrossDomainMessenger() {
    ICrossDomainMessenger messenger = _getMessenger();

    require(
      msg.sender == address(messenger) &&
        messenger.xDomainMessageSender() == address(_getProxyDelegation()),
      "MainnetDelegation: sender is not the cross-domain messenger"
    );
    _;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       ADMIN FUNCTIONS                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function setProxyDelegation(address proxyDelegation) external onlyOwner {
    _setProxyDelegation(proxyDelegation);
  }

  /// @inheritdoc IMainnetDelegation
  function relayDelegations(bytes calldata encodedMsgs) external onlyOwner {
    _relayDelegations(encodedMsgs);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                         DELEGATION                         */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IMainnetDelegation
  function setDelegationDigest(
    bytes32 digest
  ) external onlyCrossDomainMessenger {
    _setDelegationDigest(digest);
  }

  function removeDelegations(
    address[] calldata delegators
  ) external onlyCrossDomainMessenger {
    for (uint256 i; i < delegators.length; ++i) {
      _removeDelegation(delegators[i]);
    }
  }

  function setBatchAuthorizedClaimers(
    address[] calldata delegators,
    address[] calldata claimers
  ) external onlyCrossDomainMessenger {
    uint256 delegatorsLen = delegators.length;
    require(delegatorsLen == claimers.length);
    for (uint256 i; i < delegatorsLen; ++i) {
      _setAuthorizedClaimer(delegators[i], claimers[i]);
    }
  }

  function setBatchDelegation(
    address[] calldata delegators,
    address[] calldata delegates,
    address[] calldata claimers,
    uint256[] calldata quantities
  ) external onlyCrossDomainMessenger {
    uint256 delegatorsLen = delegators.length;
    require(
      delegatorsLen == delegates.length &&
        delegatorsLen == claimers.length &&
        delegatorsLen == quantities.length
    );

    for (uint256 i; i < delegatorsLen; ++i) {
      address delegator = delegators[i];
      _setDelegation(delegator, delegates[i], quantities[i]);
      _setAuthorizedClaimer(delegator, claimers[i]);
    }
  }

  /// @inheritdoc IMainnetDelegation
  /// @notice deprecated
  function setDelegation(
    address delegator,
    address operator,
    uint256 quantity
  ) external onlyCrossDomainMessenger {
    _setDelegation(delegator, operator, quantity);
  }

  function setAuthorizedClaimer(
    address owner,
    address claimer
  ) external onlyCrossDomainMessenger {
    _setAuthorizedClaimer(owner, claimer);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          GETTERS                           */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /// @inheritdoc IMainnetDelegation
  function getMessenger() external view returns (address) {
    return address(_getMessenger());
  }

  /// @inheritdoc IMainnetDelegation
  function getProxyDelegation() external view returns (address) {
    return address(_getProxyDelegation());
  }

  /// @inheritdoc IMainnetDelegation
  function getDepositIdByDelegator(
    address delegator
  ) external view returns (uint256) {
    return _getDepositIdByDelegator(delegator);
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

  function getAuthorizedClaimer(address owner) external view returns (address) {
    return _getAuthorizedClaimer(owner);
  }
}
