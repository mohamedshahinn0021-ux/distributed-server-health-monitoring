package com.servermonitor.repository;

import com.servermonitor.entity.FailureAlert;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FailureAlertRepository extends MongoRepository<FailureAlert, String> {

    List<FailureAlert> findTop30ByOrderByAlertTimeDesc();

    List<FailureAlert> findByOrderByAlertTimeDesc();

    List<FailureAlert> findByServerIdOrderByAlertTimeDesc(String serverId);

    long countByIsAcknowledgedFalse();

    void deleteByServerId(String serverId);
}
