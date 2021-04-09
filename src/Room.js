import React, { useEffect, useRef, useState } from 'react';
import { sendData, server } from './App';
import './Modal.css';
import YouTube from 'react-youtube';
import { Redirect, Link } from 'react-router-dom';
import {Button, LinearProgress} from '@material-ui/core';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './Room.scss';

// Stackoverflow time:
function hashCode(str) { 
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
} 

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();
    
    return "00000".substring(0, 6 - c.length) + c;
}


function stringToCol(str) {
    let hash = hashCode(str);
    return "#"+ intToRGB(hash); 
}
const Room = (props) => {

    const modal = useRef(null);
    const modalText = useRef(null);
    const modalHeading = useRef(null);
    const modalSubmit = useRef(null);
    const modalForm = useRef(null);

    const chatMsgRef = useRef(null);
    const chat = useRef(null);
    const videoField = useRef(null);
    const roomLink = useRef(null);

    const [roomData, setRoom] = useState(undefined);
    const [leader, setLeader] = useState(false);
    const [vidLink, setVidLink] = useState("");
    const [users, setUsers] = useState([]);
    const [leave, setLeave] = useState(false);
    const [uid, setUid] = useState("");
    
    const [chatMessages, setChatMessages] = useState([]);
    const [recommendations, setRecommendations] = useState([]);

    const player = useRef(null);
    function checkIfUn() {
        return new Promise((resolve, reject) => {
            server.onmessage = (e) => {
                let data = JSON.parse(e.data);
                resolve(data.Success);
            };
            sendData("hasUn", {});
        });
    };
    function ask(question) {
        return new Promise(((resolve, reject) => {
          modalText.current.value = "";
          modalHeading.current.innerText = question;
          modal.current.style.display = "block";
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
        }))
      }
    
    function setUsername(un) {
        return new Promise((resolve, reject) => {
            server.onmessage = (e) => {
                let data = JSON.parse(e.data);
                if (data.Success && data.Operation === "setUn") {
                    server.onmessage = undefined;
                    resolve(true)
                }
            };
            sendData("setUn", {Username: un});
            setTimeout(() => {
                resolve(false)
            }, 3000);
        });
    }
    useEffect(() => {

        let roomId = props.match.params.roomId;
        const initRoom = async () => {
            let hasUn = await checkIfUn();
            if(!hasUn) {
                const un = await ask("Set Username:")
                await setUsername(un);
            }
            server.onmessage = (e) => handleData(e.data);
            sendData("uid", {});
            sendData("join", {
                Room: roomId
            });
        };
       
        initRoom();

    }, [props.match.params.roomId]);

    const syncVideo = async (time) => {
        let curPlayerTime = await player.current.getInternalPlayer().getCurrentTime();
        if (Math.abs(time - curPlayerTime) > 0.6) {
            player.current.getInternalPlayer().seekTo(time);
        }
    }

    const startSyncing = () => {
        let syncInterval = setInterval(async () => {
            if(player.current === null) {
                clearInterval(syncInterval);
                return;
            }
            let curTime = await player.current.getInternalPlayer().getCurrentTime();
            sendData("sync", {Time: curTime});
        },500);
    } 
    const handleData = (datastring) => {
        let data = JSON.parse(datastring);
        switch(data.Operation) {
            case "join":
                if (!data.Success) {
                    toast("ERROR: Room not found!", {type:'error'});
                    console.log("Could not join room.");
                    return;
                }
                setRoom(data.Data);
                setUsers(data.Data.Usernames);
                setVidLink(data.Data.VideoID);
                // Start to send sync data to server:
                startSyncing();
                break;
            case "uid":
                setUid(data.Data);
                break;
            case "sync":
                let leaderTime = data.Data;
                if(leader) {
                    return;
                }
                syncVideo(leaderTime);
                break;
            case "leader":
                toast("You are now the room leader!", {type: 'success', autoClose: 3000});
                setLeader(true);
                break;
            case "leaderOff":
                setLeader(false);
                break;
            case "pause":
                player.current.getInternalPlayer().pauseVideo();
                break;
            case "play":
                player.current.getInternalPlayer().playVideo();
                break;
            case "userConnected":
                setUsers(data.Data);
                break;
            case "userDisconnected":
                setUsers(data.Data)
                break;
            case "change":
                setVidLink(data.Data);
                break;
            case "leave":
                setLeave(true);
                break;
            case "recommendation":
                getVideoName(data.Data.VideoID).then(vidInfo => {
                    let recData = {
                        info: vidInfo,
                        id: data.Data.VideoID,
                        recommender: data.Data.Recommender
                    }
                    for (let index = 0; index < recommendations.length; index++) {
                        const element = recommendations[index];
                        console.log(element);
                        
                    }
                    console.log(recommendations);
                    let ids = recommendations.map(r => r.id);
                    console.log(ids);
                    if(ids.includes(recData.id)) {
                        return;
                    }
                    setRecommendations(recs => recs.concat(recData));
                });
                break;
            case "chat":
                setChatMessages(msgs => msgs.concat({msg: data.Data, time: new Date()}));
                chat.current.scrollTop = chat.current.scrollHeight - chat.current.clientHeight;
                break;
            default:
                console.warn("Unknown message from server: ")
                console.log(data);
        }
    } 

    const onPlay = (e) => {
        console.log("onPlay", e)
        sendData("play", undefined);
    }

    const sendChatMessage = (msg) => {
        sendData("chat", {
            ChatMessage: msg
        });
    }

    const chatFormSubmit = (e) => {
        e.preventDefault();
        let msg = chatMsgRef.current.value;
        chatMsgRef.current.value = "";
        if (!onlyWhiteSpace(msg))
            sendChatMessage(msg);
    }

    const getVideoName = async (id) => {
        let url = `https://noembed.com/embed?url=http://www.youtube.com/watch?v=${id}`;
        let res = await fetch(url);
        let data = await res.json();
        return {
            title: data.title,
            author: data.author_name
        };
    }
    
    const onPause = (e) => {
        console.log("onPause", e);
        sendData("pause", undefined);
    }

    const changeVideo = (e) => {
        e.preventDefault();
        console.log("Video change")
        sendData("change", {VideoLink: getVideoID(videoField.current.value)});
    }

    const playRecommendation = (id) => {
        removeRecommendation(id);
        sendData("change", {VideoLink: id});
    }

    const clearRecommendations = () => {
        setRecommendations([]);
    }

    const removeRecommendation = (id) => {
        let newRecs = recommendations.filter(rec => rec.id !== id);
        setRecommendations(newRecs);
    }

    const recommendVideo = (e) => {
        e.preventDefault();
        console.log("Video change")
        let id = getVideoID(videoField.current.value);
        if(id === "" || id === undefined || id === null) {
            return;
        }
        sendData("recommendation", {VideoLink: id});
    }

    const makeLeader = (userID) => {
        console.log("Sending leader change...")
        sendData("leader", {UserID: userID});
    }

    const getVideoID = (url) => {
        let urlObj
        try {
            urlObj = new URL(url);
        } catch {
            return "";
        }
        let vidId;
        if(urlObj.host.includes("youtube")) {
            console.log(urlObj)
            let params = new URLSearchParams(urlObj.search.substr(1 ,urlObj.search.length - 1));
            vidId = params.get("v");
        } else if (urlObj.host.includes("youtu")) {
            vidId = urlObj.pathname.substr(1, urlObj.pathname.length - 1);
        } else {
            return "";
        }
        return vidId;
        
    }
    const leaveRoom = () => {
        sendData("leave", {Room: roomData.RoomCode})
    }

    const copyRoomLink = () => {
        roomLink.current.select();
        window.document.execCommand('copy');
        toast("Link copied!", {type: 'success'})
    }

    if (leave) {
        return (
            <>
                <Redirect to="/"></Redirect>
            </>
        )
    }

    const onlyWhiteSpace = (str) => !(/\S/.test(str));
    return (roomData !== undefined) ? ( 
        <>
            <ToastContainer autoClose={1000} pauseOnHover={false} />
            <h1>
            Room: {roomData.RoomName}
            </h1>
            <h2>Roomcode: {roomData.RoomCode}</h2>
            <div className="row">
                <div className="left column"> 
                    <div className="videoPlayer">
                        <YouTube opts={{width:1080, height: 640}} videoId={vidLink} ref={player} onPlay={onPlay} onPause={onPause} />
                    </div> 
                </div>

                <div className="right column">
                    <div className="memberlist">
                        <h2>Members:</h2>
                        <ul>
                            {users.map(user => {
                            return (
                                <li>
                                    <div><h4>{user.Username}</h4> {(user.UserID !== uid && leader) && <Button onClick={() => makeLeader(user.UserID)}>Make leader</Button>  } </div>
                                </li>
                            ) 
                            })}
                        </ul>
                    </div>

                    <div>
                        <h2>Chat:</h2>
                        <div ref={chat} className="chat">
                        {chatMessages.map(msg => {
                            return (
                            <div className={"chatMessage"}>
                                <p style={{color: stringToCol(msg.msg.Sender)}}>{msg.msg.Sender}</p>
                                <p>({msg.time.toLocaleTimeString()}):</p>
                                <p>{msg.msg.Content}</p>
                                <br></br>
                            </div>
                            )

                        })}
                        </div>


                        <form onSubmit={chatFormSubmit}>
                            <input ref={chatMsgRef} type="text" placeholder="messsage"/>
                            <Button onClick={chatFormSubmit}> Send </Button>
                        </form>
                    </div>
                </div>
            </div>
            
            
            {leader && <> <h2>You are the leader of this room!</h2> </>}

            
            <div className="row">
                <div className="column videoSettings">
                    {leader && 
                    <>
                        <h2>Set video: </h2>
                        <form onSubmit={changeVideo}>
                            <input ref={videoField} placeholder="Video link here"></input>
                            <Button onClick={changeVideo}>Change video</Button>
                        </form>
                    </>
                    }
                    {!leader &&
                        <>
                        <h2>Recommend video to watch</h2>
                            <form onSubmit={recommendVideo}>
                            <input ref={videoField} placeholder="Video link here"></input>
                            <Button onClick={recommendVideo}>Recommend video</Button>
                        </form>
                        </>
                    }
                </div>

                {leader && 
            <>
            <div className="recommendations column">
                <h2>Recommendations:</h2>
                <div className="recommendationContainer">
                {recommendations.map(rec => {
                    console.log(rec);
                    return (
                        <>
                        <h3>{rec.info.title} by {rec.info.author} -  {rec.recommender}</h3>
                        <Button onClick={() => playRecommendation(rec.id)}>Play</Button> 
                        <Button onClick={() => removeRecommendation(rec.id)}>Ingore</Button>
                        </>
                    )
                })}
                </div>
                <Button onClick={clearRecommendations}>Clear</Button>
            </div>
            </>
            }
            </div>

            

            <h4>Room link:</h4>
            <textarea ref={roomLink} onClick={copyRoomLink} id="roomLink" readOnly>{window.location.toString()}</textarea>
            <br />
            <Button onClick={leaveRoom}>Leave room</Button>
        </>
    ) : (
        <>
        <div ref={modal} className={"modal question"}>
            <div className={"modal-content"}>
              <form ref={modalForm}>
                <h1 ref={modalHeading}>Modal heading</h1>
                <input type="text" ref={modalText} />
                <br />
                <Button className={"submit"} variant="contained" ref={modalSubmit} color="primary"> Go </Button>
              </form>
            </div>
        </div>
        <h1>Room loading...</h1>

        <ToastContainer autoClose={6000} pauseOnHover={false} />
        <LinearProgress></LinearProgress>
        <Link to="/">Go Back</Link>
        </>
    )
}

export default Room; 