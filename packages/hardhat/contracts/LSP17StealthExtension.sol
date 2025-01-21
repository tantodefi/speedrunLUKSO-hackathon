// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./LSP17Extension.sol";
import "./interfaces/IERC5564.sol";

/**
 * @title LSP17StealthExtension
 * @dev LSP17 Extension implementing ERC-5564 Stealth Addresses
 */
contract LSP17StealthExtension is LSP17Extension, IERC5564 {
    // Constants for function selectors
    bytes4 private constant _ANNOUNCE_SELECTOR = IERC5564.announce.selector;

    // Mapping to store announcements for each stealth address
    mapping(address => bytes[]) private _announcements;

    constructor() LSP17Extension() {}

    /**
     * @inheritdoc IERC5564
     */
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external override {
        require(stealthAddress != address(0), "LSP17Stealth: invalid stealth address");
        require(ephemeralPubKey.length > 0, "LSP17Stealth: invalid ephemeral key");

        // Store announcement data
        _announcements[stealthAddress].push(ephemeralPubKey);

        // Emit the announcement event
        emit Announcement(
            schemeId,
            stealthAddress,
            msg.sender,
            ephemeralPubKey,
            metadata
        );
    }

    /**
     * @notice Get all announcements for a stealth address
     * @param stealthAddress The stealth address to query
     * @return Array of ephemeral public keys for the stealth address
     */
    function getAnnouncements(address stealthAddress) external view returns (bytes[] memory) {
        return _announcements[stealthAddress];
    }

    /**
     * @inheritdoc LSP17Extension
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC5564).interfaceId || 
               super.supportsInterface(interfaceId);
    }
} 