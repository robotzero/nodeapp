import { run } from '../../src/functions/ping-stream';
import DynamoResource from "../../src/lib/DynamoResource";
import MockDate from 'mockdate'

describe('Ping stream', () => {
    beforeEach(() => {
        process.env.IS_OFFLINE = true;
        process.env.stage = 'test';
        process.env.EPHEMERAL_ACTIVE_STREAMS = 'ephemeral-active-streams-test';
        process.env.AGGREGATED_STREAMS_STATUS = 'aggregated-streams-status-test';
        process.env.STREAM_EXPIRY = '60';
    });

    it('updates stream with new ttl', async () => {
        MockDate.set('2019-11-25T12:34:56z');

        DynamoResource.prototype.putItem = jest.fn(() => {
            return Promise.resolve();
        });

        const event = {
            body: '{"userId":"12","streamId":"5"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"12\"}"});

        expect(DynamoResource.prototype.putItem).toHaveBeenCalledWith(
            {
                TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
                Item: {
                    user_id: "12",
                    stream_id: "5",
                    ttl: parseInt(Math.floor(Date.now() / 1000) + parseInt(process.env.STREAM_EXPIRY))
                }
            },
        );
    });

    it('returns an error when update failed', async () => {
        MockDate.set('2019-11-25T12:34:56z');
        DynamoResource.prototype.putItem = jest.fn(() => {
            return Promise.reject(new Error("error updating an item"));
        });
        const event = {
            body: '{"userId":"12","streamId":"5"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {

        }
        expect(result).toEqual({statusCode: 500, "body": "{\"exception\":\"error updating an item\"}"});

        expect(DynamoResource.prototype.putItem).toHaveBeenCalledWith(
            {
                TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
                Item: {
                    user_id: "12",
                    stream_id: "5",
                    ttl: parseInt(Math.floor(Date.now() / 1000) + parseInt(process.env.STREAM_EXPIRY))
                }
            },
        );
    });

    afterEach(() => {
        MockDate.reset();
    })
});