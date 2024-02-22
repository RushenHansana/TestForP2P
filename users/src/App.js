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
  const [callerSignal, setCallerSignal] = useState("");
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const connectionRef = useRef();
  const meRef = useRef("");
  const flagRef = useRef("");
  const callerSignalRef = useRef(null);
  const callerRef = useRef(null);

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
        video: true,
        audio: true,
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
      callerSignalRef.current = data.signal; // Update ref
      callerRef.current = data.from; // Update ref
      console.log("call accepted from:", callerRef.current);
      answerCall();
      //exit from listning 
      socket.off("callUser");
      socket.off("userJoined");
    });

    // Handle new user joining the room
    socket.on("userJoined", ({ newUserId, existingUsers }) => {
      console.log("User joined:", newUserId);
      setNewUserId(newUserId);
      
      // Create a new peer connection for each user who joins the room
      if (newUserId !== meRef.current && flagRef.current == true) {
        callUser(newUserId);
        console.log("Calling new user:", newUserId, "from:", me);
        socket.off("userJoined");
        socket.off("callUser");
        flagRef.current = false;
      }

    });
    return () => {
      // Clean up event listeners
      socket.off("userJoined");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("receiveIceCandidate");
    };
  }, []); // Empty dependency array ensures useEffect runs only once

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

    connectionRef.current = peer;
};

const answerCall = () => {
  console.log("Answering call from:", callerRef.current);
  console.log("callerSignal", callerSignalRef.current);

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
    socket.emit("answerCall", { signal: data, to: callerRef.current })
   
  });

  peer.on("stream", (stream) => {
    userVideo.current.srcObject = stream
  });

  peer.signal(callerSignal)
  connectionRef.current = peer
};

  return (
    <>
      <div className="Nav">
        
        <h1 className="headd">Instant Meeting</h1>
      </div>

      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
          <div className="video">
            {callAccepted  ?
            <video playsInline ref={userVideo} autoPlay style={{ width: "600px"}} /> :
            null}
          </div>
        </div>
        

        
      </div>
    </>
  );
}

export default App;
