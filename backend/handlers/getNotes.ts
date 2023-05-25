import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDb = new DynamoDB.DocumentClient();
const tableName = process.env.NOTES_TABLE;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const params = {
    TableName: tableName,
  };

  try {
    const result = await dynamoDb.scan(params).promise();
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": false,
      },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error(error);
    return {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": false,
      },
      statusCode: 500,
      body: JSON.stringify({ error: "Could not fetch notes" }),
    };
  }
};
