import DynamoResource from "../../lib/DynamoResource";
import dynamodbclient from '../../lib/dynamodbclient';
import isEmpty from 'lodash/isEmpty';

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
        if (isEmpty(currentItem)) {
            console.log('create');
            await dbResource.createNew({
                TableName: process.env.DYNAMODB_TABLE,
                Item: {'user_id': data.userId, 'streams': [data.streamId]}
            });
        } else {
            await dbResource.updateItem({
                TableName: process.env.DYNAMODB_TABLE,
                Key: {user_id: data.userId},
                UpdateExpression: "SET #streams = list_append(#streams, :values)",
                ExpressionAttributeNames: {"#streams": "streams"},
                ExpressionAttributeValues: {":values" : [data.streamId]},
                ReturnValues: 'ALL_NEW'
            });
        }
        return {
            statusCode: 200,
            body: JSON.stringify({message: 'Request accepted'})
        }
    } catch (exception) {
        console.log(exception.message);
        return {
            statusCode: 500,
            error: exception.message
        }
    }
};