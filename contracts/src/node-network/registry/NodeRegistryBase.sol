// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {INodeRegistryBase, Node, RegisterNode} from "./INodeRegistry.sol";
import {PublicKey} from "contracts/src/utils/PublicKey.sol";
import {NodeRegistryStorage} from "./NodeRegistryStorage.sol";
import {Errors} from "./Errors.sol";

/**
 * @author  HNT Labs
 * @title   Abstract base contract for NodeRegistryFacet.
 */

abstract contract NodeRegistryBase is INodeRegistryBase {
  /**
   * @notice  Guards functions that can only be called by the operator of the given validator.
   * @dev     Reverts if `_validator` is not operated by msg.sender.
   * @param   _validator  Address of the validator.
   */
  modifier onlyOperator(address _validator) {
    if (!_isOperatedBy(_validator, msg.sender)) revert Errors.OnlyOperator();
    _;
  }

  /**
   * @notice  Registers a node.
   * @param   _registerNodePayload  A struct that encapsulates the node information.
   */
  function _registerNode(RegisterNode calldata _registerNodePayload) internal {
    if (
      !PublicKey.addressMatchesPublicKey(
        _registerNodePayload.publicKey,
        _registerNodePayload.validator
      )
    ) revert Errors.ValidatorAddressNotDerivedFromPublicKey();

    if (_isInOperation(_registerNodePayload.validator))
      revert Errors.AlreadyRegistered();

    NodeRegistryStorage.Layout storage ds = NodeRegistryStorage.layout();

    ds.nodes[_registerNodePayload.validator] = Node(
      _registerNodePayload.operator,
      _registerNodePayload.publicKey,
      _registerNodePayload.ipAddress,
      _registerNodePayload.port
    );
    emit NodeRegistered(
      _registerNodePayload.validator,
      _registerNodePayload.operator,
      _registerNodePayload.publicKey,
      _registerNodePayload.ipAddress,
      _registerNodePayload.port
    );
  }

  /**
   * @notice  Updates a node.
   * @dev     The facet function that wraps this function is guarded by onlyOperator.
   * @param   _validator  Address of the validator.
   * @param   _ipAddress  IP address of the node.
   * @param   _port  Port of the node.
   */
  function _updateNode(
    address _validator,
    bytes4 _ipAddress,
    uint16 _port
  ) internal {
    if (!_isInOperation(_validator)) revert Errors.NotRegistered();

    NodeRegistryStorage.Layout storage ds = NodeRegistryStorage.layout();

    ds.nodes[_validator].ipAddress = _ipAddress;
    ds.nodes[_validator].port = _port;
    emit NodeUpdated(_validator, _ipAddress, _port);
  }

  /**
   * @notice  Returns the node information.
   * @param   _validator  Address of the validator.
   * @return  Node  Node information.
   */
  function _getNode(address _validator) internal view returns (Node memory) {
    if (!_isInOperation(_validator)) revert Errors.NotRegistered();
    return NodeRegistryStorage.layout().nodes[_validator];
  }

  /**
   * @notice  Checks if a validator is in operation.
   * @dev     A validator is in operation if it has been registered.
   * @param   _validator  Address of the validator.
   * @return  bool  True if the validator is in operation.
   */
  function _isInOperation(address _validator) internal view returns (bool) {
    return
      NodeRegistryStorage.layout().nodes[_validator].operator != address(0);
  }

  /**
   * @notice  Checks if a validator is operated by the given operator.
   * @param   _validator  Address of the validator.
   * @param   _operator  Address of the operator.
   * @return  bool  True if the validator is operated by the given operator.
   */
  function _isOperatedBy(
    address _validator,
    address _operator
  ) internal view returns (bool) {
    return NodeRegistryStorage.layout().nodes[_validator].operator == _operator;
  }
}
