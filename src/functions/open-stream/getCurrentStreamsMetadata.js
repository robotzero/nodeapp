import uuid from 'uuid/v4';
import isEmpty from 'lodash/isEmpty';

export default function getCurrentStreamMetadata(currentUserStream) {
    if (isEmpty(currentUserStream)) {
        return {
            newVersion: uuid(),
            streams: []
        }
    }

    return {
        newVersion: currentUserStream.Item.entity_version,
        streams: currentUserStream.Item.streams
    }
};