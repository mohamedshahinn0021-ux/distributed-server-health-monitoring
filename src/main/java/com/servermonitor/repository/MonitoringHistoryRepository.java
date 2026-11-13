package com.servermonitor.repository;

import com.servermonitor.entity.MonitoringHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonitoringHistoryRepository extends JpaRepository<MonitoringHistory, Long> {

    List<MonitoringHistory> findTop100ByOrderByCheckedAtDesc();

    List<MonitoringHistory> findTop20ByServerIdOrderByCheckedAtDesc(Long serverId);

    List<MonitoringHistory> findByServerIdOrderByCheckedAtDesc(Long serverId);

    @Query("SELECT AVG(m.responseTimeMs) FROM MonitoringHistory m WHERE m.status != 'DISCONNECTED'")
    Double findAverageHealthyResponseTime();

    @Query("SELECT m FROM MonitoringHistory m ORDER BY m.checkedAt DESC")
    List<MonitoringHistory> findRecentEntries(Pageable pageable);
}
