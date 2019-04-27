export default class DynamoResource {

    constructor(dynamoDb) {
        this.dynamoDb = dynamoDb;
    }

    getItem(params) {
        return this.dynamoDb.get(params, (error, data) => {
            if (error) {
                console.error(error);
                throw new Error('Error fetching new item');
            }
            return data.Item;
        }).promise();
    }

    updateItem(params) {
        this.dynamoDb.update(params, (error, data) => {
            if (error) {
                console.error(error);
                throw new Error('');
            }
            return data;
        }).promise();
    }

    // queryByGlobalSecondaryIndex(keyValue, indexName) {
    //     return new Promise((resolve, reject) => {
    //         const params = {
    //             IndexName: indexName,
    //             ExpressionAttributeValues: {
    //                 ":kv": keyValue
    //             },
    //             KeyConditionExpression: indexName + " = :kv",
    //             TableName: this.getTable()
    //         };
    //
    //         this.dynamoDb.query(params, (error, data) => {
    //             if (error) {
    //                 reject(error);
    //                 return;
    //             }
    //             resolve(data);
    //         });
    //     });
    // }

    createNew(params) {
        return this.dynamoDb.put(params, (error) => {
            if (error) {
                console.error(error);
                throw new Error('Error creating new item');
            }
            return params.Item;
        }).promise();
    }
}