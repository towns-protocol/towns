// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IMainnetDelegationBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          STRUCTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Delegation struct
    /// @param operator The operator address
    /// @param quantity The quantity to delegate
    /// @param delegator The delegator address
    /// @param delegationTime The delegation time
    struct Delegation {
        address operator;
        uint256 quantity;
        address delegator;
        uint256 delegationTime;
    }

    /// @notice Delegation message from L1
    /// @param delegator The delegator address
    /// @param delegatee The delegatee address
    /// @param quantity The quantity to delegate
    /// @param claimer The claimer address
    struct DelegationMsg {
        address delegator;
        address delegatee;
        uint256 quantity;
        address claimer;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event DelegationSet(address indexed delegator, address indexed operator, uint256 quantity);

    event DelegationRemoved(address indexed delegator);

    event ClaimerSet(address indexed delegator, address indexed claimer);

    event DelegationDigestSet(bytes32 digest);

    event CrossDomainMessengerSet(address messenger);

    event ProxyDelegationSet(address proxyDelegation);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error InvalidDelegator(address delegator);
    error InvalidOperator(address operator);
    error InvalidQuantity(uint256 quantity);
    error DelegationAlreadySet(address delegator, address operator);
    error DelegationNotSet();
    error InvalidClaimer(address claimer);
    error InvalidOwner(address owner);
}

interface IMainnetDelegation is IMainnetDelegationBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set proxy delegation
    /// @param proxyDelegation The proxy delegation address
    function setProxyDelegation(address proxyDelegation) external;

    /// @notice Relay cross-chain delegations
    /// @dev Only the owner can call this function
    /// @param encodedMsgs The encoded delegation messages
    function relayDelegations(bytes calldata encodedMsgs) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         DELEGATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set delegation digest from L1
    /// @dev Only the L2 messenger can call this function
    /// @param digest The delegation digest
    function setDelegationDigest(bytes32 digest) external;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the L2 messenger address
    /// @return The L2 messenger address
    function getMessenger() external view returns (address);

    /// @notice Get proxy delegation
    /// @return The proxy delegation address
    function getProxyDelegation() external view returns (address);

    /// @notice Get all mainnet delegators
    /// @return Array of all mainnet delegator addresses
    function getMainnetDelegators() external view returns (address[] memory);

    /// @notice Get the deposit ID by delegator
    /// @param delegator The mainnet delegator address
    /// @return The deposit ID
    function getDepositIdByDelegator(address delegator) external view returns (uint256);

    /// @notice Get delegation of a delegator
    /// @param delegator The delegator address
    /// @return Delegation of the delegator
    function getDelegationByDelegator(address delegator) external view returns (Delegation memory);

    /// @notice Get all delegations to a specific operator
    /// @param operator The operator address
    /// @return Array of all delegations to the operator
    function getMainnetDelegationsByOperator(
        address operator
    ) external view returns (Delegation[] memory);

    /// @notice Get the total delegated stake of an operator
    /// @param operator The operator address
    /// @return The total delegated stake of the operator
    function getDelegatedStakeByOperator(address operator) external view returns (uint256);

    /// @notice Get the authorized claimer for a mainnet delegator
    /// @param delegator The mainnet delegator address
    /// @return The authorized claimer address for the delegator
    function getAuthorizedClaimer(address delegator) external view returns (address);

    /// @notice Get all delegators that have the specified authorized claimer
    /// @param claimer The address of the authorized claimer to check for
    /// @return An array of addresses that have the specified authorized claimer
    function getDelegatorsByAuthorizedClaimer(
        address claimer
    ) external view returns (address[] memory);
}
