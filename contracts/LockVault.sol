// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LockVault (Single Vault, Strategy 1: 12-month cliff-only)
 * @notice Store purchased HLT and release after 12 months per purchase (schedule).
 */
contract LockVault is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Schedule { // per purchase
        uint128 total;      // total locked amount
        uint128 released;   // already claimed
        uint64 start;       // start timestamp (purchase time)
        uint64 unlock;      // unlock timestamp (start + 365 days)
    }

    IERC20 public immutable hltToken;
    address public crowdsale; // only crowdsale can create schedules

    mapping(address => Schedule[]) private _schedules;

    event CrowdsaleUpdated(address indexed oldCrowdsale, address indexed newCrowdsale);
    event TokensLocked(address indexed user, uint256 indexed scheduleId, uint256 amount, uint64 start, uint64 unlock);
    event TokensClaimed(address indexed user, uint256 amount, uint256[] scheduleIds);

    modifier onlyCrowdsale() {
        require(msg.sender == crowdsale, "Only crowdsale");
        _;
    }

    constructor(address _hltToken, address _owner) Ownable(_owner) {
        require(_hltToken != address(0), "Invalid token");
        hltToken = IERC20(_hltToken);
    }

    function setCrowdsale(address _crowdsale) external onlyOwner {
        require(_crowdsale != address(0), "Invalid crowdsale");
        emit CrowdsaleUpdated(crowdsale, _crowdsale);
        crowdsale = _crowdsale;
    }

    // Create a new schedule for user. Assumes tokens have been transferred to this vault first in the same tx.
    function createSchedule(address user, uint256 amount, uint64 start, uint64 unlock) external onlyCrowdsale returns (uint256 scheduleId) {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount=0");
        require(unlock > start, "Bad time");
        // No strict balance check; rely on atomic order in crowdsale (transfer first, then create).

        scheduleId = _schedules[user].length;
        _schedules[user].push(Schedule({
            total: uint128(amount),
            released: 0,
            start: start,
            unlock: unlock
        }));

        emit TokensLocked(user, scheduleId, amount, start, unlock);
    }

    function schedulesOf(address user) external view returns (Schedule[] memory) {
        return _schedules[user];
    }

    function getLockedBalance(address user) public view returns (uint256) {
        Schedule[] memory arr = _schedules[user];
        uint256 totalLeft;
        for (uint256 i = 0; i < arr.length; i++) {
            totalLeft += (uint256(arr[i].total) - uint256(arr[i].released));
        }
        return totalLeft;
    }

    function getClaimable(address user) public view returns (uint256) {
        Schedule[] memory arr = _schedules[user];
        uint256 totalClaimable;
        uint256 nowTs = block.timestamp;
        for (uint256 i = 0; i < arr.length; i++) {
            if (nowTs >= arr[i].unlock) {
                totalClaimable += (uint256(arr[i].total) - uint256(arr[i].released));
            }
        }
        return totalClaimable;
    }

    function getRemainingLockTime(address user) external view returns (uint256) {
        Schedule[] memory arr = _schedules[user];
        uint256 nowTs = block.timestamp;
        uint256 minRemain = 0;
        for (uint256 i = 0; i < arr.length; i++) {
            if (nowTs < arr[i].unlock) {
                uint256 remain = uint256(arr[i].unlock) - nowTs;
                if (minRemain == 0 || remain < minRemain) {
                    minRemain = remain;
                }
            }
        }
        return minRemain; // 0 if all unlocked
    }

    function claimAll() external nonReentrant {
        _claim(msg.sender, new uint256[](0), true);
    }

    function claim(uint256[] calldata scheduleIds) external nonReentrant {
        require(scheduleIds.length > 0, "No ids");
        _claim(msg.sender, scheduleIds, false);
    }

    function _claim(address user, uint256[] memory ids, bool all) internal {
        Schedule[] storage arr = _schedules[user];
        uint256 nowTs = block.timestamp;
        uint256 total;
        uint256[] memory claimedIds = all ? new uint256[](arr.length) : ids;
        uint256 idx;

        if (all) {
            for (uint256 i = 0; i < arr.length; i++) {
                if (nowTs >= arr[i].unlock) {
                    uint256 claimable = uint256(arr[i].total) - uint256(arr[i].released);
                    if (claimable > 0) {
                        arr[i].released = arr[i].total;
                        total += claimable;
                        claimedIds[idx++] = i;
                    }
                }
            }
            // shrink array length of claimedIds to idx (not possible in memory), emit as-is with trailing zeros ignored by clients.
        } else {
            for (uint256 k = 0; k < ids.length; k++) {
                uint256 i = ids[k];
                require(i < arr.length, "Bad id");
                require(nowTs >= arr[i].unlock, "Not unlocked");
                uint256 claimable = uint256(arr[i].total) - uint256(arr[i].released);
                require(claimable > 0, "Nothing to claim");
                arr[i].released = arr[i].total;
                total += claimable;
            }
        }

        require(total > 0, "Zero claim");
        hltToken.safeTransfer(user, total);
        emit TokensClaimed(user, total, claimedIds);
    }
}