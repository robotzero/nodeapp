import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';
import isEmpty from 'lodash/isEmpty';
import uuid from 'uuid/v4';

export const run = async (event) => {
    const data = JSON.parse(event.body);
    const dbResource = new DynamoResource(dynamodbclient(process.env));

    try {
        const currentItem = await dbResource.getItem({
            TableName: process.env.DYNAMODB_TABLE,
            Key: {
                user_id: data.userId
            }
        });

        const newVersion = uuid();

        if (isEmpty(currentItem)) {
            await dbResource.createNew({
                TableName: process.env.DYNAMODB_TABLE,
                Item: {
                    user_id: data.userId,
                    entity_version: newVersion
                }
            });
        }
        if (isEmpty(currentItem) || currentItem.Item.streams.length < parseInt(process.env.MAX_STREAMS)) {
            const currentEntityVersion = isEmpty(currentItem) ? newVersion : currentItem.Item.entity_version;
            await dbResource.updateItem({
                TableName: process.env.DYNAMODB_TABLE,
                Key: {user_id: data.userId},
                UpdateExpression: "SET #streams = list_append(if_not_exists(#streams, :empty_list), :values), #entity_version = :new_version",
                ExpressionAttributeNames: {"#streams": "streams", "#entity_version": "entity_version"},
                ExpressionAttributeValues: {":values": [data.streamId], ":empty_list": [], ":new_version": uuid(), ":current_entity_version": currentEntityVersion},
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