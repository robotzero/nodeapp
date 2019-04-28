import dynamodbclient from '../../src/lib/dynamodbclient';
import * as AWS from "aws-sdk";

describe('Create dynamodb client', () => {
    it('creates new dynamodb client with production options', async () => {
        process.env.IS_OFFLINE = false;
        let result = {};

        try {
            result = dynamodbclient();
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toBeInstanceOf(AWS.DynamoDB.DocumentClient);

        expect(result.service.endpoint.host).toEqual('dynamodb.undefined.amazonaws.com');
    });

    it('creates new dynamodb client with developtment options', async () => {
        process.env.IS_OFFLINE = true;
        let result = {};

        try {
            result = dynamodbclient();
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toBeInstanceOf(AWS.DynamoDB.DocumentClient);

        expect(result.service.endpoint.host).toEqual('localhost:8000');
    });
});