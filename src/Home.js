import React, {useEffect, useRef, useState} from 'react';
import { server, sendData } from './App';
import './Modal.css';
import './Home.scss'
import headerImg from './wwf-yellow-svg.svg';
import { Redirect } from 'react-router-dom';
import {Button} from '@material-ui/core';



const Home = () => {
    const [connected, setConnected] = useState(server.readyState === server.OPEN);
    const [username, setUsername] = useState("");
    const [roomID, setRoomID] = useState("");
    const [redirect, setRedirect] = useState(false);
    const [roomList, setRoomlist] = useState([]);
    const [showRooms, setShowRooms] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);

    const [ping, setPing] = useState(999);

    const modal = useRef(null);
    const modalText = useRef(null);
    const modalHeading = useRef(null);
    const modalSubmit = useRef(null);

    const modalClose = useRef(null);
    const modalForm = useRef(null);
    const roomlistRef = useRef(null);
    const roomCodeRef = useRef(null);

    function ask(question) {
        return new Promise(((resolve, reject) => {
          modalText.current.value = "";
          modalHeading.current.innerText = question;
          modal.current.style.display = "block";
          modalText.current.focus();
          modalSubmit.current.onclick = (e) => {
            e.preventDefault();
            resolve(modalText.current.value);
            modal.current.style.display = "none";
          };
          modalForm.current.onsubmit = (e) => {
            e.preventDefault();
            resolve(modalText.current.value);
            modal.current.style.display = "none";
          }
          modalClose.current.onclick = () => {
            resolve(null);
            modal.current.style.display = "none";
          }
        }))
      }
    let pinginterval = useRef(null);

    useEffect(() => {
       if(!connected) {
        server.onopen = () => {
            setConnected(true);
        }
        return;
       }
       sendData("hasUn", {});
       server.onmessage = (e) => {
            let data = JSON.parse(e.data);
            console.log(data); 
            switch(data.Operation) {
                case "setUn":
                    setUsername(data.Data);
                    break;
                case "hasUn":
                    if(data.Success)
                        setUsername(data.Data)
                    break;
                case "create":
                    if(data.Success) {
                        setRoomID(data.Data);
                        setRedirect(true);
                    }
                    break;
                case "rooms":
                    setRoomlist(data.Data);
                    break;
                default:
                    console.log("Unknown message...");
            }
        }
        // STUPID WORKAROUND: PLS IGNORE
        (async () => {
            let ping = await pingispongis()
            setPing(ping);
        })();

        pinginterval.current = setInterval(async () => {
            let ping = await pingispongis()
            setPing(ping);
        }, 5000);
    }, [connected]);

    const pingispongis = () => {
        return new Promise(resolve => {
            let dateNow = Date.now();
            sendData("ping", undefined);
            server.addEventListener("message", (e) => {
                let data = JSON.parse(e.data);
                if (data.Operation === "pong") {
                    let time = Date.now();
                    resolve(time - dateNow);
                }
            })
        })

    }

    let setUn = async () => {
        let answer = await ask("Set username:");
        if(answer === null || answer === "") {
            return false;
        }
        sendData("setUn", {Username: answer});
        return true;
    }

    const getRooms = () => {
        setShowRooms(true);
        sendData("rooms", {});
    }

    const newRoom = async () => {
        if(username === "") {
            let res = await setUn();
            if(!res) {
                return;
            }
        }
        let roomName = await ask("Set roomname:");
        if(roomName === null || roomName === "") {
            return;
        }
        sendData("create",{
            Room: roomName
        });

    }

    const joinRoom = (code) => {
        clearInterval(pinginterval.current);
        setRoomID(code);
        setRedirect(true);
    }

    const showJoinRoom = async () => {
        let roomcode = await ask("What's the roomcode?");
        if(roomcode === "" || roomcode == null) {
            return;
        }
        joinRoom(roomcode);
        //setShowCodeInput(true);
    }

    const joinRoomClick = (e) => {
        e.preventDefault();
        joinRoom(roomCodeRef.current.value);
    } 

    return redirect ? (
        <Redirect to={`/room/${roomID}`}></Redirect>
    ) : (connected ? (
        <>
        <div ref={modal} className={"modal question"}>
            <div className={"modal-content"}>
              <form ref={modalForm}>
                <h1 ref={modalHeading}>Modal heading</h1>
                <input type="text" ref={modalText} />
                <br />
                <Button className={"submit"} variant="contained" ref={modalSubmit} color="primary"> Go </Button>
                <Button className={"cancel"} ref={modalClose} color="secondary"> Cancel </Button>
              </form>
            </div>
        </div>
        
        <span>
            <img className="logo" src={headerImg} alt="Logo"></img>
            <h1 className="headerText">Watch w/Friends</h1>
        </span>
        <br />

        <Button variant="contained" color="primary" onClick={newRoom}>Create a Room</Button>
        <Button variant="contained" color="primary" onClick={showJoinRoom}>Join a room</Button>
        <Button variant="contained" color="primary" onClick={getRooms}>Browse rooms</Button>
        <Button variant="text"  onClick={setUn}>Set username</Button>

        {(roomList.length !== 0 && showRooms)  && 
            <div id="rooms" ref={roomlistRef}>
                <h3>Rooms</h3>
                {roomList.map(room => {
                    return (
                    <>
                    <span>
                    {room.RoomName}
                    <Button variant="contained" color="primary" onClick={() => joinRoom(room.RoomCode)}>Join</Button>
                    </span>
                        

                    </>)
                })}
                <br></br>
                <Button onClick={() => setShowRooms(false)}>Hide</Button>
            </div>
        }
        {username !== "" && <h5 id="username"> Username: {username} </h5>}
        <br></br>
        {showCodeInput &&
        <>
        <h4>Input Roomcode:</h4>
        <form onSubmit={joinRoomClick}>
            <input type="text" ref={roomCodeRef} maxLength={4} placeholder="Roomcode" />
            <input type="submit" value="Join!" />
        </form>
        <Button onClick={() => setShowCodeInput(false)}>Hide</Button>
        </>
        }
        <h5>Ping: {ping} ms</h5>
        <h3>Made by Aapo H. 2021</h3>
        <a href="https://github.com/Aapeli123/watchwithfriends3">Server Source</a>
	<a href="https://github.com/Aapeli123/watchwithfriends3-frontend"> Website Source </a>
        </>
    ) : (
        <>
            <h1>Connecting...</h1>
        </>
    ))
}

export default Home;
