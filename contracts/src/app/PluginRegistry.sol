// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {AttestationLib} from "./libraries/AttestationLib.sol";
import {DataTypes} from "./types/DataTypes.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract PluginRegistry is Facet {
    function registerPlugin(
        bytes32 schemaId,
        address plugin,
        bytes memory encodedData
    )
        external
        payable
        returns (bytes32 pluginId)
    {
        DataTypes.AttestationRequestData memory data = DataTypes.AttestationRequestData({
            recipient: address(plugin),
            expirationTime: 0,
            revocable: true,
            refUID: DataTypes.EMPTY_UID,
            data: encodedData,
            value: 0
        });

        DataTypes.AttestationRequest memory request =
            DataTypes.AttestationRequest({schemaId: schemaId, data: data});

        DataTypes.Attestation memory attestation =
            AttestationLib.attest(request.schemaId, request.data, msg.sender, 0, true);

        return attestation.uid;
    }
}
