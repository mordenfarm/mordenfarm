#!/bin/bash

# Define the files to process
FILES=("index.html" "payment.html")

# Loop through each file and replace the placeholders
for FILE in "${FILES[@]}"; do
  # Check if the file exists before processing
  if [ -f "$FILE" ]; then
    echo "Processing $FILE..."
    # Replace Firebase config placeholders
    sed -i "s|%%FIREBASE_API_KEY%%|$FIREBASE_API_KEY|g" "$FILE"
    sed -i "s|%%FIREBASE_AUTH_DOMAIN%%|$FIREBASE_AUTH_DOMAIN|g" "$FILE"
    sed -i "s|%%FIREBASE_PROJECT_ID%%|$FIREBASE_PROJECT_ID|g" "$FILE"
    sed -i "s|%%FIREBASE_STORAGE_BUCKET%%|$FIREBASE_STORAGE_BUCKET|g" "$FILE"
    sed -i "s|%%FIREBASE_MESSAGING_SENDER_ID%%|$FIREBASE_MESSAGING_SENDER_ID|g" "$FILE"
    sed -i "s|%%FIREBASE_APP_ID%%|$FIREBASE_APP_ID|g" "$FILE"
    sed -i "s|%%FIREBASE_MEASUREMENT_ID%%|$FIREBASE_MEASUREMENT_ID|g" "$FILE"
    echo "$FILE processed successfully."
  else
    echo "Warning: $FILE not found."
  fi
done

echo "Environment variable injection complete."