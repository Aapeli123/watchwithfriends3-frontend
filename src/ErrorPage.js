import React from 'react';
const ErrorPage = () => {
    return (
        <>
        <h1>
            Server disconnected!
        </h1>
        <p>My server decided not to be very uwu owo and did a big fucky wucky and disconnected. I have like zero idea why this happens, but if does, I should probably restart the server. </p>
        <a href={window.location.toString()}>Try again</a>
        </>
    )
}
export default ErrorPage;