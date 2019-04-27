import * as AWS from "aws-sdk";

let options = {};

export default function (environment) {
    if (environment.IS_OFFLINE) {
        options = {
            region: 'localhost',
            endpoint: 'http://localhost:8000',
        };
    }
    return new AWS.DynamoDB.DocumentClient(options);
}