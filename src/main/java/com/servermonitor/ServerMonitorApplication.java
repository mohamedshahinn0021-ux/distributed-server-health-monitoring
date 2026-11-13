package com.servermonitor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ServerMonitorApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServerMonitorApplication.class, args);
        System.out.println("====================================================================");
        System.out.println(" Distributed Server Health Monitoring and Failure Detection System ");
        System.out.println(" Running on: http://localhost:8080");
        System.out.println(" Admin Login: admin / admin123");
        System.out.println("====================================================================");
    }
}
