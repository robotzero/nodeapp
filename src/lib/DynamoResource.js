export default class DynamoResource {

    constructor(dynamoDb) {
        this.dynamoDb = dynamoDb;
    }

    async getItem(params) {
        return this.dynamoDb.get(params).promise();
    }

    async updateItem(params) {
        return this.dynamoDb.update(params).promise();
    }

    async createNew(params) {
        return this.dynamoDb.put(params).promise();
    }
}