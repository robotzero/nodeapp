import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';
import intersection from 'lodash/intersection';
import getCurrentStreamsMetadata from './getCurrentStreamsMetadata';
import getUpdateAggregateStream from "./getUpdateAggregateStream";
import buildOpenStreamResponse from "./buildOpenStreamResponse";

export const run = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const dbResource = new DynamoResource(dynamodbclient());

        const userStreamStatus = await dbResource.getItem({
            TableName: process.env.AGGREGATED_STREAMS_STATUS,
            Key: {
                user_id: data.userId
            }
        });

        const userStreamStatusMetadata = getCurrentStreamsMetadata(userStreamStatus);

        if (userStreamStatusMetadata.streams.length === 0) {
            await dbResource.createNew({
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Item: {
                    user_id: data.userId,
                    entity_version: userStreamStatusMetadata.newVersion,
                    streams: []
                }
            });
        }

        await dbResource.createNew({
            TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
            Item: {
                user_id: data.userId,
                stream_id: data.streamId,
                ttl: Math.floor(Date.now() / 1000) + parseInt(process.env.STREAM_EXPIRY)
            }
        });

        const activeStreams = (await dbResource.query({
            TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
            IndexName: "user_id",
            ExpressionAttributeValues: {
                ":kv": data.userId
            },
            KeyConditionExpression: "user_id = :kv",
        })).Items.map(activeStream => {
            return activeStream.stream_id;
        });
        const aliveActiveStreams = intersection(activeStreams, userStreamStatusMetadata.streams);

        await getUpdateAggregateStream(aliveActiveStreams, userStreamStatusMetadata, data)(dbResource);
        return buildOpenStreamResponse(aliveActiveStreams.length, data);
    } catch (exception) {
        console.error(exception);
        return {
            statusCode: 500,
            body: JSON.stringify({exception: exception.message})
        }
    }
};