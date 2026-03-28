#!/bin/bash

# Test push notification endpoint

if [ -z "$1" ]; then
  echo "Usage: ./test-push.sh <recipient_user_id>"
  echo "Example: ./test-push.sh 10"
  exit 1
fi

RECIPIENT_ID=$1

# Get auth token (you need to have a seller account)
# This is a sample token from the HAR log
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjksImlhdCI6MTc3MTMxODk3OSwiZXhwIjoxNzcxNDA1Mzc5fQ.V3HoTXN3HQzYTNellkxQQC9cHTkq4zmFrafY7ZGx2i0"

echo "Testing push notification..."
echo "Recipient ID: $RECIPIENT_ID"
echo ""

curl -X POST https://thenilekart.com/api/push-notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"recipientUserId\": $RECIPIENT_ID,
    \"heading\": \"Test Notification\",
    \"message\": \"Testing push notifications\",
    \"actionType\": \"home\",
    \"actionData\": {}
  }" | jq '.'
