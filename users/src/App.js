// // App.js
// import React, { useEffect, useRef, useState } from "react";
// import io from "socket.io-client";

// const socket = io.connect("http://localhost:5000"); // Connect to signaling server

// function App() {
//   const [roomID, setRoomID] = useState("");
//   const [stream, setStream] = useState(null);
//   const myVideo = useRef();
//   const remoteVideo = useRef();
//   const peerConnection = useRef(null);
//   const [usersJoined, setUsersJoined] = useState([]);

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

//     socket.on("receiveIceCandidate", (data) => {
//       // Add the received ICE candidate to the peer connection
//       if (peerConnection.current) {
//         peerConnection.current.addIceCandidate(data.candidate);
//       }
//     });
  
//     // Handle new user joined the room
//     socket.on("userJoined", (users) => {
//       setUsersJoined(users);

//       // Create a new peer connection for each user who joins the room
//       users.forEach((user) => {
//         if (user !== socket.id) {
//           const peer = new RTCPeerConnection({
//             iceServers: [
//               { urls: "stun:stun.l.google.com:19302" },
//               { urls: "stun:stun1.l.google.com:19302" },
//             ],
//           });
  
//           // Add tracks to the peer connection
//           if (stream) {
//             stream.getTracks().forEach((track) => {
//               peer.addTrack(track, stream);
//             });
//           }
  
//           // Set up event listeners for the peer connection
//           peer.onicecandidate = (event) => {
//             if (event.candidate) {
//               // Send ICE candidate to the signaling server
//               socket.emit("sendIceCandidate", {
//                 candidate: event.candidate,
//                 to: user,
//               });
//             }
//           };
  
//           peer.ontrack = (event) => {
//             // Add the remote stream to the video element
//             if (event.streams && event.streams[0]) {
//               remoteVideo.current.srcObject = event.streams[0];
//             }
//           };
  
//           // Create offer and set local description
//           peer.createOffer()
//             .then((offer) => peer.setLocalDescription(offer))
//             .then(() => {
//               // Emit the offer to the signaling server
//               socket.emit("callUser", {
//                 userToCall: user,
//                 signalData: peer.localDescription,
//                 from: socket.id,
//               });
//             })
//             .catch((error) => {
//               console.error("Error creating or setting local description:", error);
//             });
  
//           // Store the peer connection in a reference
//           peerConnection.current = peer;
//         }
//       });
//     });

//     return () => {
//       // Clean up event listeners
//       socket.off("receiveIceCandidate");
//       socket.off("callAccepted");
//     };
//   }, []); // Empty dependency array ensures useEffect runs only once

//   const handleToggleMic = () => {
//     if (stream) {
//       const audioTracks = stream.getAudioTracks();
//       audioTracks.forEach((track) => {
//         track.enabled = !track.enabled;
//       });
//     }
//   };

//   const handleToggleCamera = () => {
//     if (stream) {
//       const videoTracks = stream.getVideoTracks();
//       videoTracks.forEach((track) => {
//         track.enabled = !track.enabled;
//       });
//     }
//   };

//   return (
//     <div>
//       <video ref={myVideo} autoPlay muted style={{ width: "300px" }} />
//       <video ref={remoteVideo} autoPlay style={{ width: "300px" }} />
//       <button onClick={handleToggleMic}>Toggle Mic</button>
//       <button onClick={handleToggleCamera}>Toggle Camera</button>
//     </div>
//   );
// }

// export default App;


import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import io from "socket.io-client";

const socket = io.connect("ec2-52-66-239-80.ap-south-1.compute.amazonaws.com"); // Connect to signaling server

function App() {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const [roomID, setRoomID] = useState("");

  useEffect(() => {
    // Extract room ID from URL
    const url = window.location.href;
    const splitURL = url.split("/");
    const roomIDFromURL = splitURL[splitURL.length - 1];
    setRoomID(roomIDFromURL);

    // Get user media
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((currentStream) => {
        setStream(currentStream);
        myVideo.current.srcObject = currentStream;

        // Join the room automatically when the component mounts
        socket.emit("joinRoom", roomIDFromURL);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
      });

    return () => {
      // Clean up event listeners
      socket.off("userJoined");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("callEnded");
    };
  }, []); // Empty dependency array ensures useEffect runs only once

  useEffect(() => {
    socket.on("userJoined", (user) => {
      // Handle user joined event
      if (user !== socket.id) {
        // Create a new peer connection when another user joins the room
        const peer = new Peer({
          initiator: true,
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

        peer.on("signal", (data) => {
          // Send signal data to the new user
          socket.emit("callUser", {
            userToCall: user,
            signalData: data,
            from: socket.id,
          });
        });

        peer.on("stream", (stream) => {
          // Display remote user's video stream
          userVideo.current.srcObject = stream;
        });

        socket.on("callAccepted", (signal) => {
          // Handle call accepted event
          setCallAccepted(true);
          peer.signal(signal);
        });

        connectionRef.current = peer;
      }
    });

    socket.on("callUser", ({ signalData, from }) => {
      if (from !== socket.id) {
        setCallAccepted(false);
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

        peer.on("signal", (data) => {
          // Answer the call and send signal data to the caller
          socket.emit("callAccepted", { signal: data, to: from });
        });

        peer.on("stream", (stream) => {
          // Display remote user's video stream
          userVideo.current.srcObject = stream;
        });

        peer.signal(signalData);
        connectionRef.current = peer;
      }
    });

    socket.on("callEnded", () => {
      // Handle call ended event
      setCallEnded(true);
      connectionRef.current.destroy();
    });

    return () => {
      // Clean up event listeners
      socket.off("userJoined");
      socket.off("callUser");
      socket.off("callAccepted");
      socket.off("callEnded");
    };
  }, [stream]); // Include stream in the dependency array

  const leaveCall = () => {
    // Handle leaving the call
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <div className="container">
      <div className="video-container">
        <div className="video">
          {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
        </div>
        <div className="video">
          {callAccepted && !callEnded ? <video playsInline ref={userVideo} autoPlay style={{ width: "600px" }} /> : null}
        </div>
      </div>
      <div className="myId">
        {/* Add UI elements as needed */}
      </div>
    </div>
  );
}

export default App;








