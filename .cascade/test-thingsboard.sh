#!/bin/bash

echo "=== Testing ThingsBoard Connection ==="
echo ""

echo "1. Testing network connectivity..."
ping -c 3 192.168.31.113

echo ""
echo "2. Testing ThingsBoard API..."
curl -X POST http://192.168.31.113:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "3. Checking if FUXA is running..."
curl -s http://localhost:1881/api/thingsboard/status || echo "FUXA not running or endpoint not available"

echo ""
echo "=== Test Complete ==="
