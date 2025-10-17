// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/TestToken.sol";

contract TestTokenTest is Test {
    TestToken public token;
    address public user = address(0x1);
    
    function setUp() public {
        token = new TestToken();
    }
    
    function testClaimFaucet() public {
        vm.prank(user);
        token.claimFaucet();
        
        assertEq(token.balanceOf(user), token.FAUCET_AMOUNT());
    }
    
    function testClaimCooldown() public {
        vm.startPrank(user);
        token.claimFaucet();
        
        vm.expectRevert("Claim cooldown not met");
        token.claimFaucet();
        vm.stopPrank();
    }
}