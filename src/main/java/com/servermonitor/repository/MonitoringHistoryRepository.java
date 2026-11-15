package com.servermonitor.repository;

import com.servermonitor.entity.MonitoringHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonitoringHistoryRepository extends MongoRepository<MonitoringHistory, String> {

    List<MonitoringHistory> findTop100ByOrderByCheckedAtDesc();

    List<MonitoringHistory> findTop20ByServerIdOrderByCheckedAtDesc(String serverId);

    List<MonitoringHistory> findByServerIdOrderByCheckedAtDesc(String serverId);

    void deleteByServerId(String serverId);
}
