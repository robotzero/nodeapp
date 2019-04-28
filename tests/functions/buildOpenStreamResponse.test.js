import buildOpenStreamResponse from '../../src/functions/open-stream/buildOpenStreamResponse';

describe('Build open stream response', () => {
    beforeEach(() => {
        process.env.IS_OFFLINE = true;
        process.env.stage = 'test';
        process.env.EPHEMERAL_ACTIVE_STREAMS = 'ephemeral-active-streams-test';
        process.env.AGGREGATED_STREAMS_STATUS = 'aggregated-streams-status-test';
        process.env.STREAM_EXPIRY = '60';
        process.env.MAX_ALLOWED_STREAMS = '3'
    });

    it('it returns 200 response when user is allow to open new stream', async () => {
        const event = {
            body: '{"userId":"12","streamId":"5"}'
        };

        let result = {};

        try {
            result = buildOpenStreamResponse(1, JSON.parse(event.body));
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 200, body: "{\"status\":200,\"streamId\":\"5\",\"userId\":\"12\"}"});
    });

    it('it returns 403 response when user is allow to open new stream', async () => {
        const event = {
            body: '{"userId":"12","streamId":"5"}'
        };

        let result = {};

        try {
            result = buildOpenStreamResponse(3, JSON.parse(event.body));
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({statusCode: 403, body: "{\"status\":403,\"streamId\":\"5\",\"userId\":\"12\"}"});
    });
});