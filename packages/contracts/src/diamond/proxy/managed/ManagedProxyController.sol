// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IManagedProxy} from "./IManagedProxy.sol";

// libraries
import {ManagedProxyStorage} from "./ManagedProxyStorage.sol";

// contracts
import {Proxy} from "../Proxy.sol";

/**
 * @title Proxy with externally controlled implementation
 * @dev implementation fetched using immutable function selector
 */
abstract contract ManagedProxyController is IManagedProxy, Proxy {
  /**
   * @param managerSelector function selector used to fetch implementation from manager
   */
  function __ManagedProxy_init(
    bytes4 managerSelector,
    address manager
  ) internal {
    _setManagerSelector(managerSelector);
    _setManager(manager);
  }

  /**
   * @inheritdoc Proxy
   */
  function _getImplementation()
    internal
    view
    virtual
    override
    returns (address)
  {
    bytes4 managerSelector = ManagedProxyStorage.layout().managerSelector;

    (bool success, bytes memory data) = _getManager().staticcall(
      abi.encodeWithSelector(managerSelector, msg.sig)
    );

    if (!success) revert ManagedProxy__FetchImplementationFailed();
    return abi.decode(data, (address));
  }

  /**
   * @notice get manager of proxy implementation
   * @return manager address
   */
  function _getManager() internal view virtual returns (address) {
    return ManagedProxyStorage.layout().manager;
  }

  /**
   * @notice set manager of proxy implementation
   * @param manager address
   */
  function _setManager(address manager) internal virtual {
    ManagedProxyStorage.layout().manager = manager;
  }

  /**
   * @notice set manager selector of proxy implementation
   * @param managerSelector function selector used to fetch implementation from manager
   */
  function _setManagerSelector(bytes4 managerSelector) internal virtual {
    ManagedProxyStorage.layout().managerSelector = managerSelector;
  }
}
