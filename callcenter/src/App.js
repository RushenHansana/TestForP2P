import React, { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@material-ui/core";
import AssignmentIcon from "@material-ui/icons/Assignment";
import PhoneIcon from "@material-ui/icons/Phone";
import MicIcon from "@material-ui/icons/Mic";
import MicOffIcon from "@material-ui/icons/MicOff";
import VideocamIcon from "@material-ui/icons/Videocam";
import VideocamOffIcon from "@material-ui/icons/VideocamOff";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";
import companylogo from "./photos/companylogo.png";

const socket = io.connect("ec2-52-66-239-80.ap-south-1.compute.amazonaws.com");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [sessionLink, setSessionLink] = useState("");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
      });

    socket.on("me", (id) => {
      setMe(id);
    });
  }, []);

  const toggleMic = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const createSession = () => {
    // Emit an event to the server to create a room
    socket.emit("createRoom");
  
    // Listen for the roomCreated event from the server
    socket.on("roomCreated", (roomId) => {
      // Append the room ID to the end of the link
      const sessionLink = `${window.location.origin}/join/${roomId}`;
      // Update the state with the session ID and link
      setSessionId(roomId);
      setSessionLink(sessionLink);
    });
  };
  

  return (
    <>
      <div className="Nav">
        <img src={companylogo} alt="" />
        <h1 className="headd">Instant Meeting</h1>
      </div>

      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
        </div>
        <div className="myId">
          <CopyToClipboard text={sessionLink} style={{ marginBottom: "2rem" }}>
            <Button variant="contained" color="primary" startIcon={<AssignmentIcon fontSize="large" />}>
              Copy Invite Link
            </Button>
          </CopyToClipboard>
          <div className="call-button">
            <Button variant="contained" color="primary" onClick={createSession}>
              Create Meeting
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

