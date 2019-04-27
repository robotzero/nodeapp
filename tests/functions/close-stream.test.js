import { run } from '../../src/functions/close-stream';
import DynamoResource from "../../src/lib/DynamoResource";

describe('Close stream', () => {
    beforeEach(() => {
        mockDynamoResource();
        process.env.stage = 'test';
        process.env.ACTIVE_STREAMS = 'active-streams';
        process.env.STREAMS = 'streams';
    });

    it('deletes an item from dynamodb', async () => {
        const event = {
            body: '{"streamId":"5"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\"}"});

        expect(DynamoResource.prototype.deleteItem).toHaveBeenCalledWith(
            {
                TableName: process.env.ACTIVE_STREAMS,
                Key: {
                    stream_id: "5",
                }
            },
        );
    });

    it('returns an error when update failed', async () => {
        DynamoResource.prototype.deleteItem = jest.fn(() => {
            return Promise.reject(new Error('error deleting an item'));
        });
        const event = {
            body: '{"streamId":"5"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {

        }
        expect(result).toEqual({statusCode: 500, body: "{\"exception\":\"error deleting an item\"}"});

        expect(DynamoResource.prototype.deleteItem).toHaveBeenCalledWith(
            {
                TableName: process.env.ACTIVE_STREAMS,
                Key: {
                    stream_id: "5",
                }
            },
        );
    });
});

function mockDynamoResource () {
    DynamoResource.prototype.deleteItem = jest.fn(() => {
        return Promise.resolve();
    });
}