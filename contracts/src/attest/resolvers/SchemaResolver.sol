// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISchemaResolver} from
    "@ethereum-attestation-service/eas-contracts/resolver/ISchemaResolver.sol";

// types
import {Attestation} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// errors
import {
    AccessDenied,
    InvalidEAS,
    InvalidLength
} from "@ethereum-attestation-service/eas-contracts/Common.sol";

// contracts

abstract contract SchemaResolver is ISchemaResolver {
    error InsufficientValue();
    error NotPayable();

    address internal immutable appRegistry;

    constructor(address _appRegistry) {
        if (_appRegistry == address(0)) {
            revert InvalidEAS();
        }
        appRegistry = _appRegistry;
    }

    modifier onlyAppRegistry() {
        if (msg.sender != appRegistry) {
            revert AccessDenied();
        }
        _;
    }

    receive() external payable virtual {
        if (!isPayable()) {
            revert NotPayable();
        }
    }

    /// @inheritdoc ISchemaResolver
    function isPayable() public pure virtual returns (bool) {
        return false;
    }

    /// @inheritdoc ISchemaResolver
    function attest(Attestation calldata attestation)
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        return onAttest(attestation, msg.value);
    }

    /// @inheritdoc ISchemaResolver
    function multiAttest(
        Attestation[] calldata attestations,
        uint256[] calldata values
    )
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        uint256 length = attestations.length;
        if (length != values.length) {
            revert InvalidLength();
        }

        // We are keeping track of the remaining ETH amount that can be sent to resolvers and will
        // keep deducting
        // from it to verify that there isn't any attempt to send too much ETH to resolvers. Please
        // note that unless
        // some ETH was stuck in the contract by accident (which shouldn't happen in normal
        // conditions), it won't be
        // possible to send too much ETH anyway.
        uint256 remainingValue = msg.value;

        for (uint256 i = 0; i < length; ++i) {
            // Ensure that the attester/revoker doesn't try to spend more than available.
            uint256 value = values[i];
            if (value > remainingValue) {
                revert InsufficientValue();
            }

            // Forward the attestation to the underlying resolver and return false in case it isn't
            // approved.
            if (!onAttest(attestations[i], value)) {
                return false;
            }

            unchecked {
                // Subtract the ETH amount, that was provided to this attestation, from the global
                // remaining ETH amount.
                remainingValue -= value;
            }
        }

        return true;
    }

    /// @inheritdoc ISchemaResolver
    function revoke(Attestation calldata attestation)
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        return onRevoke(attestation, msg.value);
    }

    /// @inheritdoc ISchemaResolver
    function multiRevoke(
        Attestation[] calldata attestations,
        uint256[] calldata values
    )
        external
        payable
        onlyAppRegistry
        returns (bool)
    {
        uint256 length = attestations.length;
        if (length != values.length) {
            revert InvalidLength();
        }

        // We are keeping track of the remaining ETH amount that can be sent to resolvers and will
        // keep deducting
        // from it to verify that there isn't any attempt to send too much ETH to resolvers. Please
        // note that unless
        // some ETH was stuck in the contract by accident (which shouldn't happen in normal
        // conditions), it won't be
        // possible to send too much ETH anyway.
        uint256 remainingValue = msg.value;

        for (uint256 i = 0; i < length; ++i) {
            // Ensure that the attester/revoker doesn't try to spend more than available.
            uint256 value = values[i];
            if (value > remainingValue) {
                revert InsufficientValue();
            }

            // Forward the revocation to the underlying resolver and return false in case it isn't
            // approved.
            if (!onRevoke(attestations[i], value)) {
                return false;
            }

            unchecked {
                // Subtract the ETH amount, that was provided to this attestation, from the global
                // remaining ETH amount.
                remainingValue -= value;
            }
        }

        return true;
    }

    /// @notice Hook that is called before an attestation is created
    /// @param attestation The attestation data
    /// @param value The amount of ETH sent with the attestation
    /// @return Whether the attestation is valid
    function onAttest(
        Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        returns (bool);

    /// @notice Hook that is called before an attestation is revoked
    /// @param attestation The attestation data
    /// @param value The amount of ETH sent with the revocation
    /// @return Whether the attestation can be revoked
    function onRevoke(
        Attestation calldata attestation,
        uint256 value
    )
        internal
        virtual
        returns (bool);
}
