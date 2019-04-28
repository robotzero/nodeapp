import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';

export const run = async (event) => {
    try {
        const {streamId, userId} = JSON.parse(event.body);
        const dbResource = new DynamoResource(dynamodbclient());

        await dbResource.deleteItem({
            TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
            Key: {stream_id: streamId}
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 200,
                streamId: streamId,
                userId: userId
            })
        }
    } catch (exception) {
        console.error(exception);
        return {
            statusCode: 500,
            body: JSON.stringify({exception: exception.message})
        }
    }
};