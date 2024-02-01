// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {INodeRegistryBase, Node} from "./INodeRegistry.sol";
import {PublicKey} from "contracts/src/utils/PublicKey.sol";
import {NodeRegistryStorage} from "./NodeRegistryStorage.sol";
import {NodeModifiers} from "../NodeModifiers.sol";
import {EIP712} from "contracts/src/diamond/utils/cryptography/EIP712.sol";

/**
 * @author  HNT Labs
 * @title   Abstract base contract for NodeRegistryFacet.
 */

abstract contract NodeRegistryBase is INodeRegistryBase, NodeModifiers, EIP712 {
  /// @dev `keccak256("RegisterNode(address validator,address operator,bytes publicKey,string socket)")`
  bytes32 public constant _REGISTER_NODE_TYPEHASH =
    0x0376bb7156ea3ffb54f9d5b9643340adecec8a7cd45f67d18b895111149a953d;

  /**
   * @notice  Registers a node.
   * @param   registerNodePayload  A struct that encapsulates the node information.
   */
  function _registerNode(RegisterNode calldata registerNodePayload) internal {
    if (
      !PublicKey.addressMatchesPublicKey(
        registerNodePayload.publicKey,
        registerNodePayload.validator
      )
    ) revert NodeRegistry__ValidatorAddressNotDerivedFromPublicKey();

    if (_isInOperation(registerNodePayload.validator))
      revert NodeRegistry__AlreadyRegistered();

    NodeRegistryStorage.Layout storage ds = NodeRegistryStorage.layout();

    ds.nodes[registerNodePayload.validator] = Node(
      registerNodePayload.operator,
      registerNodePayload.publicKey,
      registerNodePayload.socket
    );
    emit NodeRegistered(
      registerNodePayload.validator,
      registerNodePayload.operator,
      registerNodePayload.publicKey,
      registerNodePayload.socket
    );
  }

  /**
   * @notice  Updates a node.
   * @dev     The facet function that wraps this function is guarded by onlyOperator.
   * @param   validator  Address of the validator.
   * @param   socket     Socket of the node.
   */
  function _updateNode(address validator, string memory socket) internal {
    if (!_isInOperation(validator)) revert NodeRegistry__NotRegistered();

    NodeRegistryStorage.Layout storage ds = NodeRegistryStorage.layout();

    ds.nodes[validator].socket = socket;
    emit NodeUpdated(validator, socket);
  }

  /**
   * @notice  Returns the node information.
   * @param   validator  Address of the validator.
   * @return  Node  Node information.
   */
  function _getNode(address validator) internal view returns (Node memory) {
    if (!_isInOperation(validator)) revert NodeRegistry__NotRegistered();
    return NodeRegistryStorage.layout().nodes[validator];
  }

  /**
   * @notice  Returns the EIP712 hash of the register node payload.
   * @param   registerNodePayload  A struct that encapsulates the node information.
   * @return  bytes32  EIP712 hash of the register node payload.
   */
  function _getRegisterNodeDigest(
    RegisterNode calldata registerNodePayload
  ) public view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            _REGISTER_NODE_TYPEHASH,
            registerNodePayload.validator,
            registerNodePayload.operator,
            registerNodePayload.publicKey,
            registerNodePayload.socket
          )
        )
      );
  }
}
