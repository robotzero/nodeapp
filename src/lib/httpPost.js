import {RxHR} from '@akanass/rx-http-request';

export default async function (payload) {
    RxHR.post('http://localhost:3000/stream-callback', payload).subscribe(
        (_) => {
            // We do not care about the callback result for now
        },
        (error) => console.error(error.message)
    );
}