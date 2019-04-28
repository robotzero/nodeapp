import * as AWS from "aws-sdk";

const offlineOptions = {
    region: 'localhost',
    endpoint: 'http://localhost:8000'
};

const isOffline = () => !!(JSON.parse(String(process.env.IS_OFFLINE).toLowerCase()));

export default function () {
    return isOffline()
        ? new AWS.DynamoDB.DocumentClient(offlineOptions)
        : new AWS.DynamoDB.DocumentClient({});
}