import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";

import {
  KeyHelper,
  SignedPublicPreKeyType,
  SignalProtocolAddress,
  SessionBuilder,
  PreKeyType,
  SessionCipher,
  MessageType,
} from "@privacyresearch/libsignal-protocol-typescript";

import "./App.css";
import {
  Paper,
  Grid,
  Typography,
  Button,
  Chip,
  TextField,
} from "@material-ui/core";
import SendIcon from "@material-ui/icons/Send";

import { SignalProtocolStore } from "./storage-type";
import { SignalDirectory } from "./signal-directory";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    margin: "auto",
    maxWidth: "90%",
  },
  image: {
    width: 128,
    height: 128,
  },
  container: {
    padding: theme.spacing(2),
  },
  buttonitem: {
    margin: 10,
    padding: 10,
  },
  message: {
    padding: 10,
    backgroundColor: "lightsteelblue",
    margin: 10,
    maxWidth: "90%",
    textAlign: "left",
  },
  outgoingmessage: {
    padding: 10,
    backgroundColor: "linen",
    margin: 10,
    maxWidth: "90%",
  },
  img: {
    margin: "auto",
    display: "block",
    maxWidth: "100%",
    maxHeight: "100%",
  },
  story: {
    margin: "auto",
    display: "block",
    textAlign: "left",
    fontSize: "10pt",
  },
}));

interface ChatMessage {
  id: number;
  to: string;
  from: string;
  message: MessageType;
  delivered: boolean;
}
interface ProcessedChatMessage {
  id: number;
  to: string;
  from: string;
  messageText: string;
}
let msgID = 0;

function getNewMessageID(): number {
  return msgID++;
}

// 创建地址 TODO: 后续改为设备id改为唯一
const adalheidAddress = new SignalProtocolAddress("客户端1", 1);

function App() {

  // 仓库
  const [adiStore] = useState(new SignalProtocolStore());

  const [aHasIdentity, setAHasIdentity] = useState(false);

  // 目录
  const [directory] = useState(new SignalDirectory());

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [processedMessages, setProcessedMessages] = useState<ProcessedChatMessage[]>([]);

  const [hasSession, setHasSession] = useState(false);

  const [processing, setProcessing] = useState(false);

  // 发送消息
  const sendMessage = (to: string, from: string, message: MessageType) => {
    const msg = { to, from, message, delivered: false, id: getNewMessageID() };
    console.log("发送消息：",msg);
    setMessages([...messages, msg]);
  };

  useEffect(() => {
    if (!messages.find((m) => !m.delivered) || processing) {
      return;
    }

    const getReceivingSessionCipherForRecipient = (to: string) => {
      // 从布伦希尔德发送到阿达尔海德，所以使用他的商店
      return new SessionCipher(adiStore, adalheidAddress);
    };

    const doProcessing = async () => {
      while (messages.length > 0) {
        const nextMsg = messages.shift();
        if (!nextMsg) {
          continue;
        }
        const cipher = getReceivingSessionCipherForRecipient(nextMsg.to);
        const processed = await readMessage(nextMsg, cipher);
        processedMessages.push(processed);
      }
      setMessages([...messages]);
      setProcessedMessages([...processedMessages]);
    };
    setProcessing(true);
    doProcessing().then(() => {
      setProcessing(false);
    });
  }, [adiStore, messages, processedMessages, processing]);

  // 解析消息
  const readMessage = async (msg: ChatMessage, cipher: SessionCipher) => {
    let plaintext: ArrayBuffer = new Uint8Array().buffer;
    if (msg.message.type === 3) {
      console.log({ msg });
      plaintext = await cipher.decryptPreKeyWhisperMessage(
        msg.message.body!,
        "binary"
      );
      setHasSession(true);
    } else if (msg.message.type === 1) {
      plaintext = await cipher.decryptWhisperMessage(
        msg.message.body!,
        "binary"
      );
    }
    const stringPlaintext = new TextDecoder().decode(new Uint8Array(plaintext));

    console.log("解析前",msg.message.body!);
    console.log("解析后",stringPlaintext);

    const { id, to, from } = msg;
    return { id, to, from, messageText: stringPlaintext };
  };

  const storeSomewhereSafe = (store: SignalProtocolStore) => (
    key: string,
    value: any
  ) => {
    store.put(key, value);
  };

  /**
   * 生成一个 id
   * @param name    名称 
   * @param store   仓库
   */
  const createID = async (name: string, store: SignalProtocolStore) => {
    // 生成一个注册id
    const registrationId = KeyHelper.generateRegistrationId();

    // TODO：把生成的 id 存储到本地
    storeSomewhereSafe(store)(`registrationID`, registrationId);

    // 生成身份密钥对
    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();

    // TODO：把生成的身份密钥对存储到本地
    storeSomewhereSafe(store)("identityKey", identityKeyPair);

    // 生成一个预共享密钥
    const baseKeyId = Math.floor(10000 * Math.random());

    // 存储预密钥
    const preKey = await KeyHelper.generatePreKey(baseKeyId);

    // 存储预密钥
    store.storePreKey(`${baseKeyId}`, preKey.keyPair);

    // 随机生成一个签名密钥 id
    const signedPreKeyId = Math.floor(10000 * Math.random());

    // 生成签名密钥
    const signedPreKey = await KeyHelper.generateSignedPreKey(
      identityKeyPair,
      signedPreKeyId
    );

    // 存储签名密钥
    store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);

    // 存储公钥
    const publicSignedPreKey: SignedPublicPreKeyType = {
      keyId: signedPreKeyId,
      publicKey: signedPreKey.keyPair.pubKey,
      signature: signedPreKey.signature,
    };

    // 现在我们将其注册到服务器，以便所有用户都可以看到它们
    const publicPreKey: PreKeyType = {
      keyId: preKey.keyId,
      publicKey: preKey.keyPair.pubKey,
    };

    // 将密钥存储到目录
    directory.storeKeyBundle(name, {
      registrationId,
      identityPubKey: identityKeyPair.pubKey,
      signedPreKey: publicSignedPreKey,
      oneTimePreKeys: [publicPreKey],
    });

  };


  // 给用户生成身份密钥对
  const createAdalheidIdentity = async () => {
    await createID("adalheid", adiStore);
    console.log({ adiStore });
    setAHasIdentity(true);
  };
  const createBrunhildeIdentity = async () => {
    await createID("brünhild", brunhildeStore);
    setBHasIdentity(true);
  };


  const starterMessageBytes = Uint8Array.from([
    0xce,
    0x93,
    0xce,
    0xb5,
    0xce,
    0xb9,
    0xce,
    0xac,
    0x20,
    0xcf,
    0x83,
    0xce,
    0xbf,
    0xcf,
    0x85,
  ]);

  // 创建会话
  const startSessionWithBrunhilde = async () => {
    // get Brünhild' key bundle
    const brunhildeBundle = directory.getPreKeyBundle("brünhild");
    console.log({ brunhildeBundle });

    const recipientAddress = brunhildeAddress;

    // Instantiate a SessionBuilder for a remote recipientId + deviceId tuple.
    const sessionBuilder = new SessionBuilder(adiStore, recipientAddress);

    // Process a prekey fetched from the server. Returns a promise that resolves
    // once a session is created and saved in the store, or rejects if the
    // identityKey differs from a previously seen identity for this address.
    console.log("adalheid processing prekey");
    await sessionBuilder.processPreKey(brunhildeBundle!);

    // Now we can send an encrypted message
    const adalheidSessionCipher = new SessionCipher(adiStore, recipientAddress);
    const ciphertext = await adalheidSessionCipher.encrypt(
      starterMessageBytes.buffer
    );

    sendMessage("brünhild", "adalheid", ciphertext);
  };

  const startSessionWithAdalheid = async () => {
    // get Adalheid's key bundle
    const adalheidBundle = directory.getPreKeyBundle("adalheid");
    console.log({ adalheidBundle });

    const recipientAddress = adalheidAddress;

    // Instantiate a SessionBuilder for a remote recipientId + deviceId tuple.
    const sessionBuilder = new SessionBuilder(brunhildeStore, recipientAddress);

    // Process a prekey fetched from the server. Returns a promise that resolves
    // once a session is created and saved in the store, or rejects if the
    // identityKey differs from a previously seen identity for this address.
    console.log("brünhild processing prekey");
    await sessionBuilder.processPreKey(adalheidBundle!);

    // Now we can send an encrypted message
    const brunhildeSessionCipher = new SessionCipher(
      brunhildeStore,
      recipientAddress
    );
    const ciphertext = await brunhildeSessionCipher.encrypt(
      starterMessageBytes.buffer
    );

    sendMessage("adalheid", "brünhild", ciphertext);
  };

  const displayMessages = (sender: string) => {
    return processedMessages.map((m) => (
      <React.Fragment>
        {m.from === sender ? <Grid xs={2} item /> : <div />}
        <Grid xs={10} item key={m.id}>
          <Paper
            className={
              m.from === sender ? classes.outgoingmessage : classes.message
            }
          >
            <Typography variant="body1">{m.messageText}</Typography>
          </Paper>
        </Grid>
        {m.from !== sender ? <Grid xs={2} item /> : <div />}
      </React.Fragment>
    ));
  };

  const getSessionCipherForRecipient = (to: string) => {
    // send from Brünhild to adalheid so use his store
    const store = to === "adalheid" ? brunhildeStore : adiStore;
    const address = to === "adalheid" ? adalheidAddress : brunhildeAddress;
    return new SessionCipher(store, address);
  };

  const encryptAndSendMessage = async (to: string, message: string) => {
    const cipher = getSessionCipherForRecipient(to);
    const from = to === "adalheid" ? "brünhild" : "adalheid";
    const ciphertext = await cipher.encrypt(
      new TextEncoder().encode(message).buffer
    );
    if (from === "adalheid") {
      setAdalheidTyping("");
    } else {
      setBrunhildeTyping("");
    }
    sendMessage(to, from, ciphertext);
  };

  const sendMessageControl = (to: string) => {
    const value = to === "adalheid" ? brunhildeTyping : adalheidTyping;
    const onTextChange =
      to === "adalheid" ? setBrunhildeTyping : setAdalheidTyping;
    return (
      <Grid item xs={12} key="input">
        <Paper className={classes.paper}>
          <TextField
            id="outlined-multiline-static"
            label={`Message ${to}`}
            multiline
            value={value}
            onChange={(event) => {
              onTextChange(event.target.value);
            }}
            variant="outlined"
          ></TextField>
          <Button
            onClick={() => encryptAndSendMessage(to, value)}
            variant="contained"
            className={classes.buttonitem}
          >
            {" "}
            <SendIcon />
          </Button>
        </Paper>
      </Grid>
    );
  };

  return (
    <div className="App">
      <Paper className={classes.paper}>
        <Grid container spacing={2} className={classes.container}>
          <Grid item xs={6}>
            <Paper className={classes.paper}>
              <Grid container key={"header"}>
                <Grid item xs={11}>
                  <Typography
                    variant="h5"
                    style={{ textAlign: "right", verticalAlign: "top" }}
                    gutterBottom
                  >
                    客户端1
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  {aHasIdentity ? (
                    <React.Fragment>
                      <Chip
                        label={`客户端1注册ID: ${adiStore.get(
                          "registrationID",
                          ""
                        )}`}
                      ></Chip>
                      {hasSession || !(aHasIdentity && bHasIdentity) ? (
                        <div />
                      ) : (
                        <Button
                          className={classes.buttonitem}
                          variant="contained"
                          onClick={startSessionWithBrunhilde}
                        >
                          与客户端2开始会话
                        </Button>
                      )}
                    </React.Fragment>
                  ) : (
                    <Button
                      className={classes.buttonitem}
                      variant="contained"
                      onClick={createAdalheidIdentity}
                    >
                      为客户端1创建身份
                    </Button>
                  )}
                </Grid>
                {hasSession ? sendMessageControl("brünhild") : <div />}
                {displayMessages("adalheid")}
              </Grid>
            </Paper>
          </Grid>

          {/* 客户端2 */}
          <Grid item xs={6}>
            <Paper className={classes.paper}>
              <Grid container>
                <Grid item xs={10}>
                  <Typography
                    variant="h5"
                    style={{ textAlign: "left", verticalAlign: "top" }}
                    gutterBottom
                  >
                   客户端2
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  {bHasIdentity ? (
                    <React.Fragment>
                      <Chip
                        label={`客户端2注册ID: ${brunhildeStore.get(
                          "registrationID",
                          ""
                        )}`}
                      ></Chip>
                      {hasSession || !(aHasIdentity && bHasIdentity) ? (
                        <div />
                      ) : (
                        <Button
                          className={classes.buttonitem}
                          variant="contained"
                          onClick={startSessionWithAdalheid}
                        >
                          与客户端1开始会话
                        </Button>
                      )}
                    </React.Fragment>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={createBrunhildeIdentity}
                    >
                      为客户端2创建身份
                    </Button>
                  )}
                </Grid>
                {hasSession ? sendMessageControl("adalheid") : <div />}
                {displayMessages("brünhild")}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </div>
  )
}

export default App;
