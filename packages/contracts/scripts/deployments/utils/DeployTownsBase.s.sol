// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// interfaces

// libraries
import {Create2Utils} from "../../../src/utils/libraries/Create2Utils.sol";

// contracts
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";
import {TownsDeployer} from "src/tokens/towns/base/TownsDeployer.sol";
import {MockTowns} from "test/mocks/MockTowns.sol";
import {MockTownsDeployer} from "test/mocks/MockTownsDeployer.sol";

contract DeployTownsBase is Deployer {
    address public l1Token = 0x000000Fa00b200406de700041CFc6b19BbFB4d13;
    bytes32 public implSalt;
    bytes32 public proxySalt;

    function versionName() public pure override returns (string memory) {
        return "utils/towns";
    }

    function __deploy(address deployer) internal override returns (address proxy) {
        (implSalt, proxySalt) = _getSalts();

        address vault = _getVault(deployer);
        proxy = _proxyAddress(_implAddress(implSalt), proxySalt, l1Token, vault);
        if (proxy.code.length != 0) return proxy;

        if (!isTesting()) {
            vm.broadcast(deployer);
            if (isAnvil()) {
                new MockTownsDeployer(l1Token, vault, implSalt, proxySalt);
            } else {
                new TownsDeployer(l1Token, vault, implSalt, proxySalt);
            }
        } else {
            vm.prank(deployer);
            new MockTownsDeployer(l1Token, vault, implSalt, proxySalt);
        }
    }

    function _implAddress(bytes32 salt) internal view returns (address impl) {
        if (isAnvil()) {
            impl = Create2Utils.computeCreate2Address(salt, type(MockTowns).creationCode);
        } else {
            impl = Create2Utils.computeCreate2Address(salt, type(Towns).creationCode);
        }
    }

    function _proxyAddress(
        address impl,
        bytes32 salt,
        address remoteToken,
        address owner
    ) internal pure returns (address proxy) {
        bytes memory byteCode = bytes.concat(
            type(ERC1967Proxy).creationCode,
            abi.encode(impl, abi.encodeCall(Towns.initialize, (remoteToken, owner)))
        );

        proxy = Create2Utils.computeCreate2Address(salt, byteCode);
    }

    function setSalts(bytes32 impl, bytes32 proxy) public {
        implSalt = impl;
        proxySalt = proxy;
    }

    function _getVault(address deployer) internal view returns (address) {
        if (isAnvil()) {
            return deployer;
        } else {
            return 0x63217D4c321CC02Ed306cB3843309184D347667B; // DAO
        }
    }

    function _getSalts() internal view returns (bytes32 impl, bytes32 proxy) {
        if (implSalt != bytes32(0) && proxySalt != bytes32(0)) {
            return (implSalt, proxySalt);
        }

        if (isAnvil()) {
            impl = 0x4e59b44847b379578588920ca78fbf26c0b4956c346fdfc0a289d4a53c0000c0;
            proxy = 0x4e59b44847b379578588920ca78fbf26c0b4956c83c2f2967966f90700000000;
        } else {
            impl = 0x4e59b44847b379578588920ca78fbf26c0b4956c8ea716a80f934b1756000020;
            proxy = 0x4e59b44847b379578588920ca78fbf26c0b4956c1594db1b919831030e120040;
        }
    }
}
