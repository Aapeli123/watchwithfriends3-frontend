import {Switch, BrowserRouter, Route} from 'react-router-dom';
import Room from './Room';
import Home from './Home';
import React, {useState} from 'react';
import ErrorPage from './ErrorPage';

let backUrl = `ws://localhost:8080/ws`
export let server = new WebSocket(backUrl);

export function sendData(operation, data) {
  if (server.readyState !== server.OPEN) {
    server.onopen = () => {
        server.send(JSON.stringify({
              Operation: operation,
              Data: data
          }))
      }
  } else {
    server.send(JSON.stringify({
          Operation: operation,
          Data: data
      }))
  }

}




function App() {
  const [connected, setConnected] = useState(true);
  const onError = (e) => {
    console.log("Server closed connection")
    setConnected(false);
    server.onerror = onError;
    server.onclose = onError;
  }
  server.onclose = onError;
  server.onerror = onError





  return connected ? (
      <BrowserRouter>
        <Switch>
          <Route path="/room/:roomId" component={Room} />
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </BrowserRouter>
    
  ) : <ErrorPage />;
}

export default App;
