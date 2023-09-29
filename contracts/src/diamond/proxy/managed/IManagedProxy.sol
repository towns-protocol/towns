// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IProxy} from "../IProxy.sol";

// libraries

// contracts

interface IManagedProxyBase is IProxy {
  error ManagedProxy__FetchImplementationFailed();
  error ManagedProxy__InvalidManager();
  error ManagedProxy__InvalidManagerSelector();
}
