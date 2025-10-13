#!/bin/bash

# Replace environment variables in index.html
sed -i "s|%%FIREBASE_API_KEY%%|$FIREBASE_API_KEY|g" index.html
sed -i "s|%%FIREBASE_AUTH_DOMAIN%%|$FIREBASE_AUTH_DOMAIN|g" index.html
sed -i "s|%%FIREBASE_PROJECT_ID%%|$FIREBASE_PROJECT_ID|g" index.html
sed -i "s|%%FIREBASE_STORAGE_BUCKET%%|$FIREBASE_STORAGE_BUCKET|g" index.html
sed -i "s|%%FIREBASE_MESSAGING_SENDER_ID%%|$FIREBASE_MESSAGING_SENDER_ID|g" index.html
sed -i "s|%%FIREBASE_APP_ID%%|$FIREBASE_APP_ID|g" index.html
sed -i "s|%%FIREBASE_MEASUREMENT_ID%%|$FIREBASE_MEASUREMENT_ID|g" index.html

echo "Environment variables replaced successfully"