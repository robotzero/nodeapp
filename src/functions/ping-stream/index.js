import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';

export const run = async (event) => {
    const data = JSON.parse(event.body);
    const dbResource = new DynamoResource(dynamodbclient(process.env));

    try {
        await dbResource.putItem({
            TableName: process.env.EPHEMERAL_ACTIVE_STREAMS,
            Item: {
                user_id: data.userId,
                stream_id: data.streamId,
                ttl: Math.floor(Date.now() / 1000) + parseInt(process.env.STREAM_EXPIRY)
            }
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
            body: JSON.stringify({exception: exception.message})
        }
    }
};