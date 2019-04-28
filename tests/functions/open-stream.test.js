import { run } from '../../src/functions/open-stream';
import DynamoResource from "../../src/lib/DynamoResource";
import MockDate from "mockdate";
jest.mock('uuid/v4');
const uuid = require('uuid/v4');

// This is more integration test than unit test as I decided not to mock all its helpers to see
// how they cooperate fully under different contexts.
describe('Open stream', () => {
    beforeEach(() => {
        process.env.IS_OFFLINE = true;
        process.env.stage = 'test';
        process.env.EPHEMERAL_ACTIVE_STREAMS = 'ephemeral-active-streams-test';
        process.env.AGGREGATED_STREAMS_STATUS = 'streams';
        process.env.STREAM_EXPIRY = '60';
        process.env.MAX_ALLOWED_STREAMS = 3;
        uuid.mockImplementationOnce(() => '12345').mockImplementationOnce(() => '123456');
    });

    it('creates new active stream', async () => {
        MockDate.set('2019-11-25T12:34:56z');
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
                return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{streamId: 5, userId: 1}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId":"5", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.createNew).toHaveBeenCalledWith(
            {
                TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
                Item: {
                    user_id: "1",
                    stream_id: "5",
                    ttl: Math.floor(Date.now() / 1000) + parseInt(process.env.STREAM_EXPIRY)
                }
            },
        );
    });

    it('creates new tracking stream', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{streamId: 5, userId: 1}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId":"5", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.createNew).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Item: {
                    user_id: '1',
                    streams: [],
                    entity_version: '12345'
                }
            },
        );
    });

    it('updates tracking stream', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: "1"}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId":"5", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "1"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["5"], ":new_version": '123456', ":current_entity_version": '12345'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('updates tracking stream without creating new one', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({Item: {user_id: 1, streams: ["3"], entity_version: '1234'}});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: "1"}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId":"5", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.createNew).not.toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Item: {
                    user_id: '1',
                    streams: [],
                    entity_version: '1234'
                }
            },
        );

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "1"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["5"], ":new_version": '12345', ":current_entity_version": '1234'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('refreshes stream tracking based on active streams data 1', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({Item: {user_id: "1", streams: ["5", "3"], entity_version: '1234'}});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: "1"}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId":"5", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.createNew).not.toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Item: {
                    user_id: '1',
                    streams: [],
                    entity_version: '1234'
                }
            },
        );

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "1"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["5"], ":new_version": '12345', ":current_entity_version": '1234'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('refreshes stream tracking based on active streams data 2', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({Item: {user_id: 1, streams: ["5", "3"], entity_version: '1234'}});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: 1}, {stream_id: "3", user_id: 1}, {stream_id: "6", user_id: 1}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId": "6", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"6\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "1"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["5", "3", "6"], ":new_version": '12345', ":current_entity_version": '1234'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('refreshes stream tracking based on active streams data 3', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({Item: {user_id: 1, streams: ["5", "3", "6"], entity_version: '1234'}});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: 1}, {stream_id: "3", user_id: 1}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId": "7", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"7\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "1"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["5", "3", "7"], ":new_version": '12345', ":current_entity_version": '1234'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('rejects stream when entity version does not match', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({Item: {user_id: 1, streams: ["5", "3", "6"], entity_version: '1234'}});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: 1}, {stream_id: "3", user_id: 1}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.reject(new Error("Condition Exception"));
        });

        const event = {
            body: '{"streamId": "7", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 500, body: "{\"exception\":\"Condition Exception\"}"});

        expect(DynamoResource.prototype.updateItem).toHaveBeenCalledWith(
            {
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: "1"},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": ["5", "3", "7"], ":new_version": '12345', ":current_entity_version": '1234'},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            },
        );
    });

    it('rejects stream when active streams exceeds max allowed streams', async () => {
        DynamoResource.prototype.getItem = jest.fn(() => {
            return Promise.resolve({Item: {user_id: 1, streams: ["5", "3", "6"], entity_version: '1234'}});
        });

        DynamoResource.prototype.createNew = jest.fn(() => {
            return Promise.resolve();
        });

        DynamoResource.prototype.query = jest.fn(() => {
            return Promise.resolve({Items: [{stream_id: "5", user_id: 1}, {stream_id: "3", user_id: 1}, {stream_id: "6", user_id: 1}]});
        });

        DynamoResource.prototype.updateItem = jest.fn(() => {
            return Promise.resolve({});
        });

        const event = {
            body: '{"streamId": "7", "userId":"1"}'
        };

        let result = {};

        try {
            result = await run(event);
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 403, body: "{\"status\":403,\"streamId\":\"7\",\"userId\":\"1\"}"});

        expect(DynamoResource.prototype.updateItem).not.toHaveBeenCalled();
    });

    afterEach(() => {
        uuid.mockReset();
        MockDate.reset();
    });
});