import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';
import uuid from 'uuid/v4';

export const run = async (event) => {
    const data = JSON.parse(event.body);
    const dbResource = new DynamoResource(dynamodbclient(process.env));

    try {
        await dbResource.deleteItem({
            TableName: process.env.ACTIVE_STREAMS,
            Key: {stream_id: data.streamId}
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 200,
                streamId: data.streamId,
                userId: data.userId
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