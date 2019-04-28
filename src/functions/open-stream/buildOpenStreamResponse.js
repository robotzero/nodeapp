const allowNewStream = (activeStreamsCount) => activeStreamsCount < parseInt(process.env.MAX_ALLOWED_STREAMS);

export default function buildOpenStreamResponse(activeStreamCount, {streamId, userId}) {
    if (allowNewStream(activeStreamCount)) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 200,
                streamId: streamId,
                userId: userId
            }),
        };
    }

    return {
        statusCode: 403,
        body: JSON.stringify({
            status: 403,
            streamId: streamId,
            userId: userId
        })
    }
}