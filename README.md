## Setup

```bash
npm install
serverless dynamodb install
```

To set automatic record expiry:
```
aws dynamodb --region=us-east-1 --endpoint-url http://localhost:8000 update-time-to-live --table-name ephemeral-active-streams-dev --time-to-live-specification "Enabled=true, AttributeName=ttl"
```

## Start

```bash
serverless offline start
```

## Optional step to import schema (not needed, it should be imported during start up)

```bash
serverless dynamodb migrate
```

of in more traditional way:

```bash
aws dynamodb create-table --endpoint-url http://localhost:8000 --region=us-east-1 --cli-input-json file:///$PWD/offline/dynamodb-schema/aggrecated-streams-status.json
aws dynamodb create-table --endpoint-url http://localhost:8000 --region=us-east-1 --cli-input-json file:///$PWD/offline/dynamodb-schema/ephemeral-active-streams.json
```

## Supported queries

### Request to open new stream

```bash
curl -X POST -H "Content-Type:application/json" http://localhost:3000/v1/open-stream -d '{ "userId":"1", "streamId":"1" }'
```

Successful response:

```json
{"status":200,"streamId":"1","userId":"12"}
```

Forbidden response:

```json
{"status":403,"streamId":"4","userId":"12"}
```

Failed response:
```json
{"exception":"The table does not have the specified index: user_id"}
```

### Request to open new stream

```bash
curl -X POST -H "Content-Type:application/json" http://localhost:3000/v1/ping-stream -d '{ "userId":"1", "streamId":"1" }'
```

Successful response:

```json
{"status":200,"streamId":"1","userId":"1"}
```

Failed response:
```json
{"exception":"The table does not have the specified index: user_id"}
```

### Request to close existing stream

```bash
curl -X POST -H "Content-Type:application/json" http://localhost:3000/v1/close-stream -d '{"userId":"1", "streamId":"1" }'
```

Successful response:

```json
{"status":200,"streamId":"1","userId":"1"}
```

Failed response:
```json
{"exception":"The table does not have the specified index: user_id"}
```

## Run tests

```bash
docker run -it --rm --name serveless-test-nodescript -v "$PWD":/usr/src/app -w /usr/src/app node:8 node node_modules/jest-cli/bin/jest.js tests
```

or

```bash
node_modules/jest-cli/bin/jest.js tests/
```

## Simulate expiration of data in ephemeral-active-streams-dev database.
```bash
aws dynamodb delete-item --region=us-east-1 --endpoint-url http://localhost:8000 --table-name active-streams-dev --key file:///path/to/key/key.json
```

Example key file content :

```json
{"stream_id":{"S":"7"}}
```

### Description

## Assumptions
The streamId sent in the request is always unique. Some service outside of this scope is validating this constraint.
The user has been authenticated by different service.
The deployment to AWS step is missing, as I do not own private AWS account and did not want to guess and hope for the best that it would work.
The app is relying on ability to set TTL in dynamodb (not possible to simulate locally) that allows items to be automatically deleted from the database.
 (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
The client app needs to ping v1/ping-stream endpoint every x seconds in order to inform the app that the stream is alive. 
  
## How it works?
1. User is seen for the first time when hitting v1/open-stream endpoint.

Tracking record is created in the database aggregated-streams-status-dev with user_id, empty streams array and entity_version as randomly generated hash.
Active stream record is created in the database ephemeral-active-streams-dev with user_id, stream_id and ttl set to 60 seconds in the future.
This record will expire after 60 seconds if the client app will not hit the v1/ping-endpoint
Fetch is executed on ephemeral-active-streams-dev by user_id to fetch all unexpired streamIds.
Intersection is made between records from ephemeral-active-streams-dev and empty stream array that returns empty array in this case.
Check is made between result of the intersection and max allowed streams in order to establish that user is allowed to open new stream.
Update is executed on newly created record in aggregated-streams-status-dev to the streams array and streamId from the POST is added.
Successful response is returned.

2. User is seen for the second time when hitting /v1/open-stream endpoint.
Active stream record is created in the database ephemeral-active-streams-dev with user_id, stream_id and ttl set to 60 seconds in the future.
Fetch is executed on ephemeral-active-streams-dev by user_id to fetch all unexpired streamIds.
Intersection is made between records from ephemeral-active-streams-dev and one element array that returns new array with all elements that exists in both arrays.
Check is made between result of the intersection and max allowed streams in order to establish that user is allowed to open new stream.
Update is executed on existing record in aggregated-streams-status-dev to the streams array and set to intersection result array plus streamId.
Successful response is returned.

3. User is seen for the fourth time when hitting /v1/open-stream endpoint.
Active stream record is created in the database ephemeral-active-streams-dev with user_id, stream_id and ttl set to 60 seconds in the future. (In this case this is 4 record)
Fetch is executed on ephemeral-active-streams-dev by user_id to fetch all unexpired streamIds.
Intersection is made between records from ephemeral-active-streams-dev (4 records) and 3 element array that returns new array with all elements that exists in both arrays. (In this case 3 elements are returned)
Check is made between result of the intersection and max allowed streams in order to establish that user is allowed to open new stream.
Forbidden response is returned.

Race condition prevention
The update on aggregated-streams-status-dev is going to be executed potentially from couple of lambdas at the same time. Even though update expressions in dynamodb
are being atomic it is not enough to prevent a condition when during updating the data already have been updated by something else.
The get query executed on aggregated-streams-status-dev is also fetching entity_version hash. During update on the same table, there is a condition expression
that compares fetched entity_version hash with that of record being updated. If they do not match, meaning something already has changed the data, update fails and the app sends 500 error to the client.

User unable to watch new streams prevention
There is a potential scenario in which user would be stopped from starting new stream even in the case of not exceeding max streams allowance. For example when network failure
prevented the client from hitting v1/close-stream endpoint. The automatic expiry of ephemeral-active-streams-dev records should prevent this from happening. Worse case scenario
would be that user is unable to watch content for 60 seconds (depends on the TTL value);

User able to watch more streams that he/she is allowed
There is a potential scenario in which client stopped sending data to v1/ping-stream (due to some failures), but the actual stream is still open. The TTL causes the active streams data to be deleted.
This opens up a potential issue where user would be able to open new stream, in the situation where he/she has 3 streams opened already.
The solution for this would be to set up trigger on dynamodb table ephemeral-active-streams-dev and hook it up to the new lambda. Tha lambda would filter by all the received DELETE records
and make additional checks that would ask the streaming service if indeed the stream is still open for this user and take appropriate action.

## DB schema
Dynamodb schema is located in offline/dynamodbSchema folder

## Scaling
Incorporation of dynamodb and lambda should allow for fairly easy scaling. Set up around dynamodb throughput provisioning and lambda settings tweaking will have to happen
in order to use scaling capabilities.
Due to the implementation of "poor's man" locking functionality in code and entity versioning, there should not be any issues with race conditions
that would allow users to watch 4 or more streams at the same time.

There is also prevention mechanism that should never allow for the situation where user is stuck and is unable to watch streams because the client never hit v1/close-stream endpoint.
The mechanism relies on TTL functionality of dynamodb.

## Left todo
Configuring docker.
Integration tests.