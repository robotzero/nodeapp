import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';
import isEmpty from 'lodash/isEmpty';

export const run = async (event) => {
    const data = JSON.parse(event.body);
    const dbResource = new DynamoResource(dynamodbclient(process.env));

    try {
        // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
        const currentItem = await dbResource.getItem({
            TableName: process.env.DYNAMODB_TABLE,
            ConsistentRead: true,
            Key: {
                user_id: data.userId
            }
        });
        if (isEmpty(currentItem)) {
            console.log("empty");
            await dbResource.createNew({
                TableName: process.env.DYNAMODB_TABLE,
                Item: {'user_id': data.userId, 'streams': [data.streamId]}
            });
            return {
                statusCode: 200,
                body: JSON.stringify({
                    streamId: data.streamId,
                    instanceId: data.instanceId
                }),
            };
        } else {
            if (currentItem.Item.streams.length < parseInt(process.env.MAX_STREAMS)) {
                console.log("update");
                console.log(data.streamId);
                console.log(currentItem.Item.streams);
                await dbResource.updateItem({
                    TableName: process.env.DYNAMODB_TABLE,
                    Key: {user_id: data.userId},
                    UpdateExpression: "SET #streams = list_append(#streams, :values)",
                    ExpressionAttributeNames: {"#streams": "streams"},
                    ExpressionAttributeValues: {":values": ['IKK']},
                    ReturnValues: 'ALL_NEW'
                });
                return {
                    statusCode: 200,
                    body: JSON.stringify({
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
        }
    } catch (exception) {
        console.log(exception.message);
        return {
            statusCode: 500,
            error: exception.message
        }
    }
};