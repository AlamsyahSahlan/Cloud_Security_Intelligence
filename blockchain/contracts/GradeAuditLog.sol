// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GradeAuditLog
 * @dev Smart contract untuk mencatat setiap perubahan nilai siswa secara immutable.
 * Mencegah kecurangan perubahan nilai oleh oknum internal.
 * Setiap perubahan dicatat di ledger blockchain dan tidak bisa dihapus.
 */
contract GradeAuditLog is AccessControl {
    bytes32 public constant GURU_ROLE = keccak256("GURU_ROLE");

    struct GradeChange {
        string studentId;
        string subjectId;
        uint256 oldScore;      // Score * 100 untuk handle desimal (e.g., 85.5 = 8550)
        uint256 newScore;
        string teacherId;
        uint256 timestamp;
        string reason;
    }

    mapping(string => GradeChange[]) public studentGradeHistory;
    GradeChange[] public allChanges;
    uint256 public totalChanges;

    event GradeChanged(
        string indexed studentId,
        string subjectId,
        uint256 oldScore,
        uint256 newScore,
        string teacherId,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GURU_ROLE, msg.sender);
    }

    /**
     * @dev Mencatat perubahan nilai ke blockchain. Hanya GURU atau ADMIN.
     * @param studentId ID siswa
     * @param subjectId ID mata pelajaran
     * @param oldScore Nilai lama (dikali 100)
     * @param newScore Nilai baru (dikali 100)
     * @param teacherId ID guru yang mengubah
     * @param reason Alasan perubahan nilai
     */
    function logGradeChange(
        string memory studentId,
        string memory subjectId,
        uint256 oldScore,
        uint256 newScore,
        string memory teacherId,
        string memory reason
    ) external {
        require(
            hasRole(GURU_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "GradeAuditLog: Must have GURU_ROLE or ADMIN_ROLE to log grades"
        );

        GradeChange memory newChange = GradeChange({
            studentId: studentId,
            subjectId: subjectId,
            oldScore: oldScore,
            newScore: newScore,
            teacherId: teacherId,
            timestamp: block.timestamp,
            reason: reason
        });

        studentGradeHistory[studentId].push(newChange);
        allChanges.push(newChange);
        totalChanges++;

        emit GradeChanged(studentId, subjectId, oldScore, newScore, teacherId, block.timestamp);
    }

    /**
     * @dev Mengambil riwayat perubahan nilai untuk seorang siswa.
     */
    function getStudentGradeHistory(string memory studentId) external view returns (GradeChange[] memory) {
        return studentGradeHistory[studentId];
    }

    function getTotalChanges() external view returns (uint256) {
        return totalChanges;
    }

    function getChangeByIndex(uint256 index) external view returns (GradeChange memory) {
        require(index < allChanges.length, "GradeAuditLog: Index out of bounds");
        return allChanges[index];
    }
}
