// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

/* Interfaces */

/* Libraries */
import {console} from "forge-std/console.sol";
import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Permissions} from "contracts/src/spaces/libraries/Permissions.sol";
import {DataTypes} from "contracts/src/spaces/libraries/DataTypes.sol";

/* Contracts */
import {Space} from "contracts/src/spaces/Space.sol";
import {SpaceFactory} from "contracts/src/spaces/SpaceFactory.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/spaces/entitlements/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySpacesUpgrade is ScriptUtils {
  address spaceAddress = 0x8EFa1819Ff5B279077368d44B593a4543280e402;
  address spaceFactoryAddress = 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707;

  SpaceFactory spaceFactory = SpaceFactory(spaceFactoryAddress);

  function run() external {
    vm.startBroadcast();
    // address _space = _createSimpleSpace();
    // console.log("space address: ", _space);

    Space newSpace = new Space();

    // updates new spaces being created with this new implementation
    SpaceFactory(spaceFactoryAddress).updateImplementations(
      address(newSpace),
      address(0),
      address(0),
      address(0),
      address(0)
    );

    Space(spaceAddress).upgradeTo(address(newSpace));

    vm.stopBroadcast();
  }

  function _createSimpleSpace() internal returns (address) {
    DataTypes.CreateSpaceExtraEntitlements memory _entitlementData = DataTypes
      .CreateSpaceExtraEntitlements({
        roleName: "",
        permissions: new string[](0),
        tokens: new DataTypes.ExternalToken[](0),
        users: new address[](0)
      });

    string[] memory _permissions = new string[](0);

    address space = spaceFactory.createSpace(
      DataTypes.CreateSpaceData(
        "zion",
        "!7evmpuHDDgkady9u:goerli",
        "ipfs://QmZion",
        "general",
        "!8evmpuHDDgkady6u:goerli"
      ),
      _permissions,
      _entitlementData
    );

    return space;
  }
}
