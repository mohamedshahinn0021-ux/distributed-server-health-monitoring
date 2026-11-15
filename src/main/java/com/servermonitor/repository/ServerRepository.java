package com.servermonitor.repository;

import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerRepository extends MongoRepository<Server, String> {
    long countByCurrentState(ServerState currentState);
    List<Server> findAllByOrderByServerNameAsc();
    List<Server> findByCurrentState(ServerState currentState);
}
