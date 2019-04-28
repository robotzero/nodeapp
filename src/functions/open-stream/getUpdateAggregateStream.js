import uuid from "uuid/v4";

const allowNewStream = (activeStreamsCount) => activeStreamsCount < parseInt(process.env.MAX_ALLOWED_STREAMS);

export default function (activeStreamsList, currentStreamMetadata, {userId, streamId}) {
    if (allowNewStream(activeStreamsList.length)) {
        return async (dynamoResource) => {
            const uniqueStreamList = [...new Set([...activeStreamsList, streamId])];
            await dynamoResource.updateItem({
                TableName: process.env.AGGREGATED_STREAMS_STATUS,
                Key: {user_id: userId},
                UpdateExpression: "SET #streams = :values, #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": uniqueStreamList, ":new_version": uuid(), ":current_entity_version": currentStreamMetadata.newVersion},
                ConditionExpression: '#entity_version = :current_entity_version',
                ReturnValues: 'ALL_NEW'
            });
        }
    }

    return (_) => {};
}