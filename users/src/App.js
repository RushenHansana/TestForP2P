// // App.js
// import React, { useEffect, useRef, useState } from "react";
// import io from "socket.io-client";

// const socket = io.connect("http://localhost:5000"); // Connect to signaling server

// function App() {
//   const [me, setMe] = useState(""); // Store the user's socket ID
//   const [roomID, setRoomID] = useState("");
//   const [stream, setStream] = useState(null);
//   const myVideo = useRef();
//   const remoteVideo = useRef();
//   const peerConnection = useRef(null);
//   const [usersJoined, setUsersJoined] = useState([]);
//   const [newUserId, setNewUserId] = useState(null);

//   useEffect(() => {
//     // Fetch room ID only once when the component mounts
//     const url = window.location.href;
//     const splitURL = url.split("/");
//     const roomIDFromURL = splitURL[splitURL.length - 1];
//     setRoomID(roomIDFromURL);
//     console.log("Room ID:", roomIDFromURL);

//     // Get user media
//     navigator.mediaDevices
//       .getUserMedia({
//         video: true,
//         audio: true,
//       })
//       .then((stream) => {
//         setStream(stream);
//         myVideo.current.srcObject = stream;

//         // Establish connection with signaling server
//         socket.emit("joinRoom", roomIDFromURL);
//       })
//       .catch((error) => {
//         console.error("Error accessing media devices:", error);
//       });
    
//     socket.on("me", (id) => {setMe(id);});

//     socket.on("receiveIceCandidate", (data) => {
//       // Add the received ICE candidate to the peer connection
//       if (peerConnection.current) {
//         peerConnection.current.addIceCandidate(data.candidate);
//       }
//     });


  
//     // Handle new user joined the room
//     socket.on("userJoined", ({ newUserId, existingUsers }) => {
//       console.log("User joined:", newUserId);
//       setNewUserId(newUserId);
//       // Create a new peer connection for each user who joins the room
//       if (newUserId !== me) {
//         //initiate a call to the new user
          
//         }
//       });
//     });
  
      


//   }, []); // Empty dependency array ensures useEffect runs only once



// export default App;

//App.js
import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import io, { connect } from "socket.io-client";
import { Button, IconButton, TextField } from "@material-ui/core";
import AssignmentIcon from "@material-ui/icons/Assignment";
import PhoneIcon from "@material-ui/icons/Phone";
import "./App.css";
import companylogo from "./photos/companylogo.png";

const socket = io.connect("http://localhost:5000"); // Connect to signaling server

function App() {
  const [me, setMe] = useState(""); // Store the user's socket ID
  const [roomID, setRoomID] = useState("");
  const [stream, setStream] = useState(null);
  const myVideo = useRef();
  const [usersJoined, setUsersJoined] = useState([]);
  const [newUserId, setNewUserId] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const userVideo = useRef();
  const connectionRef = useRef();
  const meRef = useRef("");
  const flagRef = useRef("");
  const callerSignalRef = useRef(null);
  const callerRef = useRef(null);
  const peerRef = useRef();

  useEffect(() => {
    flagRef.current = true;
    // Fetch room ID only once when the component mounts
    const url = window.location.href;
    const splitURL = url.split("/");
    const roomIDFromURL = splitURL[splitURL.length - 1];
    setRoomID(roomIDFromURL);
    console.log("Room ID:", roomIDFromURL);

    // Get user media
    navigator.mediaDevices
      .getUserMedia({
        video: {
          frameRate: 24,
          width: { min: 480, ideal: 720, max: 1280 },
          aspectRatio: 1.33333
        },
        audio: true
      })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;

        // Establish connection with signaling server
        socket.emit("joinRoom", roomIDFromURL);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
      });
    
    socket.on("me", (id) => {
      setMe(id);
      meRef.current = id;
      console.log("me", id);
    });

    // socket.on("receiveIceCandidate", (data) => {
    //   // Add the received ICE candidate to the peer connection
    //   if (peerConnection.current) {
    //     peerConnection.current.addIceCandidate(data.candidate);
    //   }
    // });

    // Handle receiving a call
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
      //exit from listning 
  
    });

    // Handle new user joining the room
    socket.on("userJoined", ({ newUserId, existingUsers }) => {
      console.log("User joined:", newUserId);
      setNewUserId(newUserId);
      
      // Create a new peer connection for each user who joins the room
      if (newUserId !== meRef.current && flagRef.current === true) {
        //callUser(newUserId);
        console.log("Calling new user:", newUserId, "from:", me);
        flagRef.current = false;
      }

    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peerRef.current.signal(signal);
      connectionRef.current = peerRef.current;
      console.log("Call accepted from useeffet:", newUserId);
    });
  }, []); // Empty dependency array ensures useEffect runs only once

  const Join = () => {
    if (newUserId !== meRef.current ) {
      
      callUser(newUserId);
  
      console.log("Calling new user:", newUserId, "from:", me);
  
    }
  };

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          {urls: "stun:stun.1.google.com:19302"},
          {urls: "stun:stun2.1.google.com:19302"},
          {urls: "stun:stun3.1.google.com:19302"}
          ]
        }
    });

    peer.on("icecandidate", (event) => {
      if (event.candidate) {
        socket.emit("sendIceCandidate", {
          to: id,
          candidate: event.candidate,
        });
      }
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: meRef.current,
      });
      console.log("Calling user:", id, "from:", meRef.current);
    });

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    }); 

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
      console.log("Call accepted from:", id);
    });
    peerRef.current = peer;

    connectionRef.current = peer;
};

const answerCall = () => {
  console.log("Answering call from:", caller);
  console.log("callerSignal", callerSignal);

  setCallAccepted(true)
  const peer = new Peer({
    initiator: false,
    trickle: false,
    stream: stream,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ]
    }
  });

  peer.on("icecandidate", (event) => {
    if (event.candidate) {
      socket.emit("sendIceCandidate", {
        candidate: event.candidate,
        to: callerRef.current,
      });
    }
  });

  peer.on("signal", (data) => {
    console.log("data", data);
    socket.emit("answerCall", { signal: data, to: caller})

   
  });

  peer.on("stream", (stream) => {
    userVideo.current.srcObject = stream
  });
  console.log("callerSignal", caller);

  peer.signal(callerSignal)
  connectionRef.current = peer
};

const leaveCall = () => {
  setCallEnded(true);
  connectionRef.current.destroy();
};
const [message, setMessage] = useState('');
const printtag =()=>{
  setMessage("Click the Phone Icon");

};


  return (
    <>
      <div className="Nav">
        <img src={companylogo} alt=""/>
        <h1 className="headd">Instant Meeting</h1>
      </div>

      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
          <div className="video">
            
            <video playsInline ref={userVideo} autoPlay style={{ width: "600px"}} /> 
          </div>
        </div>
        <div className="myId">
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <Button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </Button>
            ) : (
              <IconButton color="primary" aria-label="call" onClick={() => callUser(newUserId)}>
                <PhoneIcon fontSize="large" />
              </IconButton>
            )}
           
           
          </div>
        </div>
        <div className="call-accept">
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1 > is calling...</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </Button>
            </div>
          ) : null}
        </div>
        
        <div className="btns">
          
        
          <div className="capture-button1">
            <Button variant="contained" color="primary" onClick={()=> {Join();printtag()}}>
              Join Meeting 
            </Button>
          </div>

        </div>
      </div>
    </>
  );
}

export default App;
