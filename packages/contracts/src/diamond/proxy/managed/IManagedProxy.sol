// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IProxy} from "../IProxy.sol";

// libraries

// contracts

interface IManagedProxy is IProxy {
  error ManagedProxy__FetchImplementationFailed();
}
