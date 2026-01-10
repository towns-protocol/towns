// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ICrossDomainMessenger} from "src/base/registry/facets/mainnet/ICrossDomainMessenger.sol";
import {IMainnetDelegation} from "src/base/registry/facets/mainnet/IMainnetDelegation.sol";

// libraries
import {MainnetDelegationStorage} from "./MainnetDelegationStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {MainnetDelegationBase} from "src/base/registry/facets/mainnet/MainnetDelegationBase.sol";

contract MainnetDelegation is IMainnetDelegation, MainnetDelegationBase, OwnableBase, Facet {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          MODIFIER                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier onlyCrossDomainMessenger() {
        address messenger = _getMessenger();

        require(
            msg.sender == messenger &&
                ICrossDomainMessenger(messenger).xDomainMessageSender() == _getProxyDelegation(),
            "MainnetDelegation: sender is not the cross-domain messenger"
        );
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        INITIALIZERS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __MainnetDelegation_init(address messenger) external onlyInitializing {
        __MainnetDelegation_init_unchained(messenger);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMainnetDelegation
    function setProxyDelegation(address proxyDelegation) external onlyOwner {
        MainnetDelegationStorage.layout().proxyDelegation = proxyDelegation;

        emit ProxyDelegationSet(proxyDelegation);
    }

    /// @inheritdoc IMainnetDelegation
    function relayDelegations(bytes calldata encodedMsgs) external onlyOwner {
        _relayDelegations(encodedMsgs);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         DELEGATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMainnetDelegation
    function setDelegationDigest(bytes32 digest) external onlyCrossDomainMessenger {
        MainnetDelegationStorage.layout().delegationDigest = digest;

        emit DelegationDigestSet(digest);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IMainnetDelegation
    function getMessenger() external view returns (address) {
        return _getMessenger();
    }

    /// @inheritdoc IMainnetDelegation
    function getProxyDelegation() external view returns (address) {
        return address(_getProxyDelegation());
    }

    /// @inheritdoc IMainnetDelegation
    function getMainnetDelegators() external view returns (address[] memory) {
        return _getMainnetDelegators();
    }

    /// @inheritdoc IMainnetDelegation
    function getDepositIdByDelegator(address delegator) external view returns (uint256) {
        return _getDepositIdByDelegator(delegator);
    }

    /// @inheritdoc IMainnetDelegation
    function getDelegationByDelegator(address delegator) external view returns (Delegation memory) {
        return _getDelegationByDelegator(delegator);
    }

    /// @inheritdoc IMainnetDelegation
    function getMainnetDelegationsByOperator(
        address operator
    ) external view returns (Delegation[] memory) {
        return _getMainnetDelegationsByOperator(operator);
    }

    /// @inheritdoc IMainnetDelegation
    function getDelegatedStakeByOperator(address operator) external view returns (uint256) {
        return _getDelegatedStakeByOperator(operator);
    }

    /// @inheritdoc IMainnetDelegation
    function getAuthorizedClaimer(address delegator) external view returns (address) {
        return _getAuthorizedClaimer(delegator);
    }

    /// @inheritdoc IMainnetDelegation
    function getDelegatorsByAuthorizedClaimer(
        address claimer
    ) external view returns (address[] memory) {
        return _getDelegatorsByAuthorizedClaimer(claimer);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __MainnetDelegation_init_unchained(address messenger) internal {
        _addInterface(type(IMainnetDelegation).interfaceId);
        MainnetDelegationStorage.layout().messenger = messenger;

        emit CrossDomainMessengerSet(messenger);
    }
}
