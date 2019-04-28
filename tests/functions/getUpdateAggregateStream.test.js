import getUpdateAggregateStream from '../../src/functions/open-stream/getUpdateAggregateStream';
import DynamoResource from "../../src/lib/DynamoResource";
jest.mock('uuid/v4');
const uuid = require('uuid/v4');

describe('Get Update Aggregate Stream', () => {
    beforeEach(() => {
        process.env.IS_OFFLINE = true;
        process.env.stage = 'test';
        process.env.EPHEMERAL_ACTIVE_STREAMS = 'ephemeral-active-streams-test';
        process.env.AGGREGATED_STREAMS_STATUS = 'aggregated-streams-status-test';
        process.env.STREAM_EXPIRY = '60';
        process.env.MAX_ALLOWED_STREAMS = '3'
        uuid.mockImplementationOnce(() => '12345').mockImplementationOnce(() => '123456');
        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });
    });

    it('it executes update when new stream is allowed to open', async () => {
        const event = {
            body: '{"userId":"12","streamId":"5"}'
        };

        let result = {};

        try {
            await getUpdateAggregateStream(["1", "1"], {newVersion: "1234"}, JSON.parse(event.body))(new DynamoResource(null));
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "12"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["1", "5"], ":new_version": '12345', ":current_entity_version": '1234'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('it does nothing when new stream is not allowed to open', async () => {
        const event = {
            body: '{"userId":"12","streamId":"5"}'
        };

        try {
            await getUpdateAggregateStream(["1", "5", "6"], {newVersion: "1234"}, JSON.parse(event.body))(new DynamoResource(null));
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(DynamoResource.prototype.updateItem).not.toHaveBeenCalled();
    });
});