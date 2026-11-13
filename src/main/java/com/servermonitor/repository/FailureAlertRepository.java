package com.servermonitor.repository;

import com.servermonitor.entity.FailureAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FailureAlertRepository extends JpaRepository<FailureAlert, Long> {

    List<FailureAlert> findTop30ByOrderByAlertTimeDesc();

    List<FailureAlert> findByOrderByAlertTimeDesc();

    List<FailureAlert> findByServerIdOrderByAlertTimeDesc(Long serverId);

    long countByIsAcknowledgedFalse();
}
