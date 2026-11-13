package com.servermonitor.repository;

import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerRepository extends JpaRepository<Server, Long> {
    long countByCurrentState(ServerState currentState);
    List<Server> findAllByOrderByServerNameAsc();
    List<Server> findByCurrentState(ServerState currentState);
}
