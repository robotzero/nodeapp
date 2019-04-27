export default class DynamoResource {

    constructor(dynamoClient) {
        this.dynamoClient = dynamoClient;
    }

    async getItem(params) {
        return this.dynamoClient.get(params).promise();
    }

    async updateItem(params) {
        return this.dynamoClient.update(params).promise();
    }

    async putItem(params) {
        return this.dynamoClient.put(params).promise();
    }

    async createNew(params) {
        return this.dynamoClient.put(params).promise();
    }

    async query(params) {
        return this.dynamoClient.query(params).promise();
    }

    async deleteItem(params) {
        return this.dynamoClient.delete(params).promise();
    }
}