// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

contract Helpers is Script {
    function getChainId() internal view returns (uint256) {
        return block.chainid;
    }
    
    function isAnvil() internal view returns (bool) {
        return getChainId() == 31337;
    }
}