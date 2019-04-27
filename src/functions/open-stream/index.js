import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';
import isEmpty from 'lodash/isEmpty';
import intersection from 'lodash/intersection';
import uuid from 'uuid/v4';

export const run = async (event) => {
    const data = JSON.parse(event.body);
    const dbResource = new DynamoResource(dynamodbclient(process.env));

    try {
        const currentItem = await dbResource.getItem({
            TableName: process.env.STREAMS,
            Key: {
                user_id: data.userId
            }
        });

        const newVersion = uuid();

        if (isEmpty(currentItem)) {
            await dbResource.createNew({
                TableName: process.env.STREAMS,
                Item: {
                    user_id: data.userId,
                    entity_version: newVersion,
                    streams: []
                }
            });
        }

        await dbResource.createNew({
            TableName: process.env.ACTIVE_STREAMS,
            Item: {
                user_id: data.userId,
                stream_id: data.streamId,
                ttl: Math.floor(Date.now() / 1000) + process.env.TTL
            }
        });

        const activeStreams = await dbResource.query({
            TableName: process.env.ACTIVE_STREAMS,
            IndexName: "user_id",
            ExpressionAttributeValues: {
                ":kv": data.userId
            },
            KeyConditionExpression: "user_id = :kv",
        });

        const activeStreamsId = activeStreams.Items.map(activeStream => {
            return activeStream.stream_id;
        });

        const aliveActiveStreams = intersection(activeStreamsId, isEmpty(currentItem) ? [] : currentItem.Item.streams);

        if (aliveActiveStreams.length < parseInt(process.env.MAX_STREAMS)) {
            aliveActiveStreams.push(data.streamId);
            const currentEntityVersion = isEmpty(currentItem) ? newVersion : currentItem.Item.entity_version;
            await dbResource.updateItem({
                TableName: process.env.STREAMS,
                Key: {user_id: data.userId},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": aliveActiveStreams, ":new_version": uuid(), ":current_entity_version": currentEntityVersion},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 200,
                    streamId: data.streamId,
                    instanceId: data.instanceId
                }),
            };
        }

        return {
            statusCode: 403,
            body: JSON.stringify({
                status: 403,
                streamId: data.streamId,
                instanceId: data.instanceId
            })
        }
    } catch (exception) {
        console.log(exception.message);
        return {
            statusCode: 500,
            error: exception.message
        }
    }
};