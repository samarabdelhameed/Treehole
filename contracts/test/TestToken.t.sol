// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {TestToken} from "../src/TestToken.sol";

contract TestTokenTest is Test {
    TestToken public token;
    address public userA = vm.addr(1);
    address public userB = vm.addr(2);
    uint256 public constant INITIAL_AMOUNT = 1000 * 10**18;

    function setUp() public {
        token = new TestToken();
    }

    function testClaimFaucetSuccess() public {
        vm.prank(userA);
        token.claimFaucet();

        vm.prank(userB);
        token.claimFaucet();

        assertEq(token.balanceOf(userA), INITIAL_AMOUNT, "User A balance incorrect");
        assertEq(token.balanceOf(userB), INITIAL_AMOUNT, "User B balance incorrect");
        assertEq(token.totalSupply(), 2 * INITIAL_AMOUNT, "Total supply incorrect");
    }

    function testTokenDetails() public {
        assertEq(token.name(), "TreeHole Token", "Token name incorrect");
        assertEq(token.symbol(), "THT", "Token symbol incorrect");
    }
}