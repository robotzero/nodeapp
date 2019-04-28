import DynamoResource from "../../src/lib/DynamoResource";
import AWSMock from 'aws-sdk-mock';
import * as AWS from "aws-sdk";

let dynamo = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000',
});

describe('DynamoResource', () => {

    let dynamoResource;

    beforeEach(() => {
        process.env.IS_OFFLINE = true;
        AWSMock.mock('DynamoDB.DocumentClient', 'update', function(params, callback) {
            callback(null, { response: { Item: { data: { S: 'data' } } } });
        });
        process.env.stage = "test";
        dynamoResource = new DynamoResource(dynamo);
    });

    it('should call update with the correct parameters', async () => {
        await dynamoResource.updateItem({
            TableName: process.env.STREAMS,
            Key: {user_id: "1"},
            UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
            ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
            ExpressionAttributeValues: {":values": ["5"], ":new_version": '12345', ":current_entity_version": '1234'},
            ConditionExpression: '#entity_version = :current_entity_version',
            ReturnValues: 'ALL_NEW'
        });
    });
});