// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {ITokenEntitlement} from "contracts/src/towns/entitlements/token/ITokenEntitlement.sol";

// contracts
interface ITownArchitectBase {
  // =============================================================
  //                           STRUCTS
  // =============================================================

  struct ChannelInfo {
    string id;
    string metadata;
  }

  struct RoleInfo {
    string name;
    string[] permissions;
  }

  struct MemberEntitlement {
    RoleInfo role;
    ITokenEntitlement.ExternalToken[] tokens;
    address[] users;
  }

  struct TownInfo {
    string id;
    string name;
    string uri;
    RoleInfo everyoneEntitlement;
    MemberEntitlement memberEntitlement;
    ChannelInfo channel;
  }

  // =============================================================
  //                           EVENTS
  // =============================================================

  event TownCreated(
    address indexed townCreator,
    uint256 indexed townId,
    address town
  );

  // =============================================================
  //                           ERRORS
  // =============================================================

  error TownArchitect__InvalidStringLength();
  error TownArchitect__InvalidNetworkId();
  error TownArchitect__InvalidAddress();
  error TownArchitect__NotContract();
}

interface ITownArchitect is ITownArchitectBase {
  /// @notice Creates a new town
  /// @param townInfo Town information
  function createTown(TownInfo memory townInfo) external returns (address);

  function computeTown(string memory townId) external view returns (address);

  function getTownArchitectImplementations()
    external
    view
    returns (
      address townToken,
      address userEntitlementImplementation,
      address tokenEntitlementImplementation
    );

  function setTownArchitectImplementations(
    address townToken,
    address userEntitlementImplementation,
    address tokenEntitlementImplementation
  ) external;

  function getTownById(string memory townId) external view returns (address);

  function getTokenIdByTownId(
    string memory townId
  ) external view returns (uint256);

  function isTokenGated(address token) external view returns (bool);

  function gateByToken(address token, uint256 quantity) external;

  function ungateByToken(address token) external;
}
