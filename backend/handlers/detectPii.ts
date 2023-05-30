import { DynamoDB } from "aws-sdk";
import {
  Comprehend,
  DetectPiiEntitiesRequest,
  DetectPiiEntitiesResponse,
  Entity,
} from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const comprehend = new Comprehend();
const dynamoDb = new DynamoDB.DocumentClient();
const tableName = process.env.NOTES_TABLE;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body);
  let text = body.text;

  // Replace multiple consecutive spaces with a single space
  text = text.replace(/\s+/g, " ");

  // Check if the byte size of the text exceeds Amazon Comprehend's limit
  const byteSize = Buffer.byteLength(text, "utf8");
  if (byteSize > 5000) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Input text exceeds the maximum allowed size of 5000 bytes",
      }),
    };
  }

  const params: DetectPiiEntitiesRequest = {
    LanguageCode: "en",
    Text: text,
  };

  try {
    const response: DetectPiiEntitiesResponse = await comprehend
      .detectPiiEntities(params)
      .promise();
    let redactedText = null; // Initialize redactedText as null
    const detectedPiiEntities: string[] = [];

    const responseContain: DetectPiiEntitiesResponse = await comprehend
      .containsPiiEntities(params)
      .promise();
    const containsPiiEntities: string[] = [];
    // Check if any PII entities are detected
    if (response.Entities && response.Entities.length > 0) {
      redactedText = text; // Set redactedText to text if there are detected entities

      // Loop over all detected entities
      response.Entities.forEach((entity: Entity) => {
        // Use the BeginOffset and EndOffset to replace PII data with asterisks
        const pii = redactedText.substring(
          entity.BeginOffset,
          entity.EndOffset
        );
        const asterisks = "*".repeat(pii.length);
        redactedText = redactedText.replace(pii, asterisks);

        // Add the entity description to the detectedPiiEntities array
        detectedPiiEntities.push(
          `${pii} is a ${entity.Type} PII data type with a score of ${entity.Score}`
        );
        // Add the entity description to the detectedPiiEntities array
        containsPiiEntities.push(
          `${pii} is a ${entity.Type} PII data type with a score of ${entity.Score}`
        );
      });
    }

    const result = {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": false,
      },
      body: JSON.stringify({
        originalContent: text,
        detectedPiiEntities: detectedPiiEntities,
        containsPiiEntities: containsPiiEntities,
        redactedContent: redactedText,
        fullResponseDetect: response,
        fullResponseContains: responseContain,

        messageLength: text.length,
        creationDate: new Date().toISOString(),
      }),
    };

    // Store result in DynamoDB
    const putParams = {
      TableName: tableName,
      Item: {
        id: uuidv4(),
        ...result,
      },
    };

    await dynamoDb.put(putParams).promise();

    return result;
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": false,
      },
      body: JSON.stringify({
        error: "An error occurred while detecting PII entities",
      }),
    };
  }
};
