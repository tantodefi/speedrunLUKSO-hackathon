// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MockTarget is ERC165 {
    event Received(address sender, uint256 amount);

    // Function to receive Ether
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 