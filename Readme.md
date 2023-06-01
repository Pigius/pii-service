## Pii Service

Application for the purpose of the demo for AWS Community Day in Warsaw 1st June 2023.

Presentation could be located in the same directory.

The application detects and redacts PII data from notes provided by a user.

## Architecture

Applications contains:

- frontend application (dashboard) for displaying form for notes, and the detections and redactions result. It's a frontend app written in React
- backend application, uses Amazon Comprehend to detects PII data. It's based on the Serverless Framework.

## Usage

Simply navigate to the frontend app and `npm install`, after run `npm start`. The frontend app should working seamlessly.

For backend you need to install `npm install` and then `sls deploy` to deploy stack. Remember to add `.envs` for the purposes of CORS.
