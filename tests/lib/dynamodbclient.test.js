import dynamodbclient, { run } from '../../src/lib/dynamodbclient';
import * as AWS from "aws-sdk";

describe('Create dynamodb client', () => {
    it('creates new dynamodb client with production options', async () => {
        let result = {};

        try {
            result = dynamodbclient({IS_OFFLINE: false});
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toBeInstanceOf(AWS.DynamoDB.DocumentClient);

        expect(result.service.endpoint.host).toEqual('dynamodb.undefined.amazonaws.com');
    });

    it('creates new dynamodb client with developtment options', async () => {
        let result = {};

        try {
            result = dynamodbclient({IS_OFFLINE: true});
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toBeInstanceOf(AWS.DynamoDB.DocumentClient);

        expect(result.service.endpoint.host).toEqual('localhost:8000');
    });
});