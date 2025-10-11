# Modern Farmer Website

This is a simple website for a fictional online course platform called "Modern Farmer".

## Features

*   **Responsive Design:** The website is designed to work on both desktop and mobile devices.
*   **Course Catalog:** Browse a catalog of agricultural courses.
*   **Search Functionality:** Search for courses by title or description.
*   **User Authentication:** Users can sign up and log in using email/password or their Google account.

## Getting Started

To run this project locally, you will need to create a `.env` file in the root of the project and add the following environment variables:

```
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
FIREBASE_APP_ID=your-firebase-app-id
FIREBASE_SERVICE_ACCOUNT=your-firebase-service-account-json
```

You can get these values from your Firebase project settings. The `FIREBASE_SERVICE_ACCOUNT` is a JSON object that you can get from the "Service accounts" tab in your Firebase project settings.

Once you have created the `.env` file, you need to run the build script to generate the `firebase-config.prod.js` file:

```
node build.js
```

After running the build script, you can open the `index.html` file in your browser to view the website.