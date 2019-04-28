import getCurrentStreamsMetadata from '../../src/functions/open-stream/getCurrentStreamsMetadata';
jest.mock('uuid/v4');
const uuid = require('uuid/v4');

describe('Get Current Streams Metadata', () => {
    beforeEach(() => {
        process.env.IS_OFFLINE = true;
        process.env.stage = 'test';
        process.env.EPHEMERAL_ACTIVE_STREAMS = 'ephemeral-active-streams-test';
        process.env.AGGREGATED_STREAMS_STATUS = 'aggregated-streams-status-test';
        process.env.STREAM_EXPIRY = '60';
        process.env.MAX_ALLOWED_STREAMS = '3';
        uuid.mockImplementationOnce(() => '12345').mockImplementationOnce(() => '123456');
    });

    it('it returns new version and empty streams when current user stream is empty', async () => {
        let result = {};

        try {
            result = getCurrentStreamsMetadata({});
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({newVersion: '12345', streams: []});
    });

    it('it returns current version and populated streams array when current user stream is not empty', async () => {
        let result = {};

        try {
            result = getCurrentStreamsMetadata({Item: {entity_version: 1, streams: [1, 2, 3]}});
        } catch (exception) {
            fail('Test failed ' + exception.message);
        }

        expect(result).toEqual({newVersion: 1, streams: [1, 2, 3]});
    });
});