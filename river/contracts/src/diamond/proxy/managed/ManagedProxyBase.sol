// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IManagedProxyBase} from "./IManagedProxy.sol";

// libraries
import {ManagedProxyStorage} from "contracts/src/diamond/proxy/managed/ManagedProxyStorage.sol";

// contracts
import {Proxy} from "../Proxy.sol";

/**
 * @title Proxy with externally controlled implementation
 * @dev implementation fetched using immutable function selector
 */
abstract contract ManagedProxyBase is IManagedProxyBase, Proxy {
  function __ManagedProxyBase_init(ManagedProxy memory init) internal {
    ManagedProxyStorage.Layout storage ds = ManagedProxyStorage.layout();
    ds.managerSelector = init.managerSelector;
    ds.manager = init.manager;
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
    if (manager == address(0)) revert ManagedProxy__InvalidManager();
    ManagedProxyStorage.layout().manager = manager;
  }

  /**
   * @notice set manager selector of proxy implementation
   * @param managerSelector function selector used to fetch implementation from manager
   */
  function _setManagerSelector(bytes4 managerSelector) internal virtual {
    if (managerSelector == bytes4(0))
      revert ManagedProxy__InvalidManagerSelector();
    ManagedProxyStorage.layout().managerSelector = managerSelector;
  }
}
