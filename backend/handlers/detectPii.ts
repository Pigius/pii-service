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
    let redactedText = text;
    const detectedPiiEntities: string[] = [];

    // Check if any PII entities are detected
    if (response.Entities && response.Entities.length > 0) {
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
      });
    }

    const result = {
      statusCode: 200,
      body: JSON.stringify({
        originalContent: text,
        detectedPiiEntities: detectedPiiEntities,
        redactedContent: redactedText,
        fullResponse: response,
        messageLength: `Length of the message is ${text.length} characters`,
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
    console.log("tableName", tableName);

    console.log(dynamoDb.put(putParams).promise());

    await dynamoDb.put(putParams).promise();
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while detecting PII entities",
      }),
    };
  }
};
