export const run = async (event) => {
    console.log(event.body);
    return {
        status: 200,
        body: JSON.stringify({message: 'Callback accepted'})
    }
};