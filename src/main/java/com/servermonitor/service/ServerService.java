package com.servermonitor.service;

import com.servermonitor.dto.ServerRequest;
import com.servermonitor.entity.Server;
import com.servermonitor.entity.ServerState;
import com.servermonitor.exception.ResourceNotFoundException;
import com.servermonitor.repository.ServerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServerService {

    private final ServerRepository serverRepository;

    public ServerService(ServerRepository serverRepository) {
        this.serverRepository = serverRepository;
    }

    public List<Server> getAllServers() {
        return serverRepository.findAllByOrderByServerNameAsc();
    }

    public Server getServerById(Long id) {
        return serverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Server not found with ID: " + id));
    }

    @Transactional
    public Server createServer(ServerRequest request) {
        Server server = new Server();
        server.setServerName(request.getServerName().trim());
        server.setIpAddress(request.getIpAddress().trim());
        server.setPort(request.getPort());
        server.setProtocol(request.getProtocol() != null ? request.getProtocol().toUpperCase() : "HTTP");
        server.setEndpointPath((request.getEndpointPath() != null && !request.getEndpointPath().trim().isEmpty()) 
                               ? request.getEndpointPath().trim() 
                               : "/");
        server.setSlowThresholdMs(request.getSlowThresholdMs() != null ? request.getSlowThresholdMs() : 500L);
        server.setDescription(request.getDescription());
        server.setCurrentState(ServerState.ACTIVE);
        server.setConsecutiveSuccesses(0);
        server.setLastResponseTimeMs(0L);
        server.setCreatedAt(LocalDateTime.now());

        return serverRepository.save(server);
    }

    @Transactional
    public Server updateServer(Long id, ServerRequest request) {
        Server server = getServerById(id);

        server.setServerName(request.getServerName().trim());
        server.setIpAddress(request.getIpAddress().trim());
        server.setPort(request.getPort());
        if (request.getProtocol() != null) {
            server.setProtocol(request.getProtocol().toUpperCase());
        }
        if (request.getEndpointPath() != null) {
            server.setEndpointPath(request.getEndpointPath().trim());
        }
        if (request.getSlowThresholdMs() != null) {
            server.setSlowThresholdMs(request.getSlowThresholdMs());
        }
        server.setDescription(request.getDescription());

        return serverRepository.save(server);
    }

    @Transactional
    public void deleteServer(Long id) {
        Server server = getServerById(id);
        serverRepository.delete(server);
    }
}
