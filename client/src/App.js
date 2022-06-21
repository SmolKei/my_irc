import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import io from "socket.io-client";
const socket = io("localhost:4242");

function App() {
  //declaration de variable avec setteur
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [msg, setMsg] = useState("");
  const [privatemsg, setprivatemsg] = useState("");
  const [login, setLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [validUsername, setValidUsername] = useState(false);
  const socketRef = useRef(null);
  const [currentServer, setCurrentServer] = useState("/");
  const [serverList, setServerList] = useState([]);

  //socket effect
  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });
    socket.on("userchange", (data) => {
      setUsername(data.nick);
      setprivatemsg(data.msg);
    });
    socket.on("storeIsClosing", () => {
      socket.emit("msg", "/join /");
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
      setLogin("");
      setUsername("");
      setValidUsername("");
    });
    socket.on("userChange", (nickname) => {
      setUsername(nickname);
    });

    
    // Private message don't work
    socket.on("privateMessage", ({ content, from }) => {
      for (let i = 0; i < username.length; i++) {
        if (username.userID === from) {
          username.privatemsg.push({
            content,
            fromSelf: false,
          });
          if (username !== validUsername) {
            username.privatemsg = true;
          }
          break;
        }
      }
    });
    socket.on("server", (serverList) => {
      setServerList(
        serverList.map((val, i) => {
          return (
            <div
              className="server-block"
              key={i}
              onClick={(e) => {
                socket.emit("msg", "/join " + e.target.innerHTML);
              }}
            >
              {val}
            </div>
          );
        })
      );
    });

    //le truc qui m'a fait un peu pleurer 
    socket.on("msg", (msg) => {
      setprivatemsg(
        msg.map((val, i) => {
          if (val[0] === ">") {
            return (
              <p key={i}>
                {val[0]} {val[1]}
              </p>
            );
          }
          return (
            <p key={i}>
              {val[0]} : {val[1]}
            </p>
          );
        })
      );
      if (socketRef.current !== null) {
        socketRef.current.scrollIntoView();
      }
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("msg");
    };
  }, [isConnected, privatemsg]);

  const sendMessage = () => {
    if (msg === "") {
      return null;
    }
    socket.emit("msg", msg);
  };

  const sendLogin = (login) => {
    if (isConnected === true) {
      socket.emit("user", login);
      socket.emit("server", currentServer);
    } else {
      setValidUsername("Failed to establish connection...");
    }
  };


  //si pas de username, page pour le demander
  if (!login) {
    return (
      <div className="App">
        <form
          className="App-header"
          onSubmit={() => {
            setLogin(username);
            sendLogin(username); //set et envoie le username grave et setter et a la fonction sendLogin
          }}
        >
          <label For="login" style={{ margin: "1em" }}>
            Insert your Username:
          </label>
          <input
            style={{ padding: "0.3em" }}
            onChange={(e) => {
              setUsername(e.target.value); //set avec la valeur de la cible
              if (e.target.value !== "") {
                setValidUsername("Press Enter to continue...");
              } else {
                setValidUsername("");
              }
            }}
            autoComplete="off"
            type="text"
            id="login"
            name="login"
          />
          <p style={{ margin: "1em", fontSize: "0.5em" }}>{validUsername}</p>
        </form>
      </div>
    );
  }
//return le chatbox
  return (
    <div className="App">
      <div className="side-info">
        <div className="user-info">
          <p>Username : {username} </p>
          <p>Connected: {"" + isConnected}</p>
        </div>
        <div className="server-info">{serverList}</div>
        <div className="actual-server">{currentServer}</div>
      </div>
      <div className="chatroom">
        <div className="chat-log">
          {privatemsg}
          <div className="bottom-bot" ref={socketRef} />
        </div>
        <div className="chat-input">
          <form
            method="POST"
            onKeyPress={(e) => { //envoie avec la touche entré grace a onKeyPress
              if (e.code === "Enter") { 
                e.preventDefault();
                document.querySelector("#msg").value = "";
                setMsg("");
                sendMessage();
              }
            }}
          >
            <div className="chat-input-bar">
              <input
                onChange={(e) => {
                  setMsg(e.target.value);
                }}
                type="text"
                autoComplete="off"
                name="msg"
                id="msg"
              />
              <button
                style={{ background: "#276a75",
                  color: "white",
                  border: "2px solid #2f3b3d",
                  padding: "1%",
                  cursor: "pointer" }}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#msg").value = "";
                  setMsg("");
                  sendMessage();
                }}
              >
                Send!
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;