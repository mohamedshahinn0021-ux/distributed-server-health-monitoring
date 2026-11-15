#!/usr/bin/env bash
# =====================================================================
# Distributed Server Health Monitoring and Failure Detection System
# Startup Script for Linux / macOS (MongoDB)
# =====================================================================

set -e
echo "====================================================================="
echo " Distributed Server Health Monitoring and Failure Detection System"
echo " Backend: Spring Boot + MongoDB"
echo "====================================================================="
echo ""
echo "Select execution mode:"
echo "1) Java Spring Boot Backend (Maven + MongoDB)"
echo "2) Instant Preview Server (Node.js)"
read -p "Enter choice [1 or 2]: " choice

if [ "$choice" = "1" ]; then
    echo "Starting Spring Boot via Maven..."
    mvn spring-boot:run
elif [ "$choice" = "2" ]; then
    echo "Starting Instant Preview Server..."
    node preview-server.js
else
    echo "Invalid option. Exiting."
    exit 1
fi
