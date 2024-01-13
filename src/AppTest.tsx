import { Button, Input } from "@material-ui/core"
import './App.css'
import { useEffect, useState } from 'react'
import { cloneDeep } from 'lodash-es'

// import SignalProtocol from "./protocol"

// import DB from "./db"
import { KeyHelper, MessageType, PreKeyType, SessionBuilder, SessionCipher, SignalProtocolAddress, SignedPublicPreKeyType } from "@privacyresearch/libsignal-protocol-typescript"
import { SignalProtocolStore } from "./storage-type"
import { SignalDirectory } from "./signal-directory"

// async function getStore() {
//   DB.exists('')
// }

async function createIdentity(name: string, identifier: string, deviceId: number, directory: SignalDirectory) {
  const address = new SignalProtocolAddress(identifier, deviceId)
  const store = new SignalProtocolStore()

  // 生成一个注册id
  const registrationId = KeyHelper.generateRegistrationId()

  // 存储注册id 1129
  store.put(`registrationID`, registrationId)

  // 生成身份密钥对
  const identityKeyPair = await KeyHelper.generateIdentityKeyPair()

  console.log("identityKeyPair",identityKeyPair)
  

  // 存储身份密钥
  store.put(`identityKey`, identityKeyPair)

  // 生成一个预共享密钥
  const baseKeyId = Math.floor(10000 * Math.random())

  // 存储预密钥
  const preKey = await KeyHelper.generatePreKey(baseKeyId)

  // 存储预密钥
  store.storePreKey(`${baseKeyId}`, preKey.keyPair);

  // 随机生成一个签名密钥 id
  const signedPreKeyId = Math.floor(10000 * Math.random())

  // 生成签名密钥
  const signedPreKey = await KeyHelper.generateSignedPreKey(
    identityKeyPair,
    signedPreKeyId
  )

  store.storeSignedPreKey(`${signedPreKeyId}`, signedPreKey.keyPair);

  const publicSignedPreKey: SignedPublicPreKeyType = {
    keyId: signedPreKeyId,
    publicKey: signedPreKey.keyPair.pubKey,
    signature: signedPreKey.signature,
  }

  // 现在我们将其注册到服务器，以便所有用户都可以看到它们
  const publicPreKey: PreKeyType = {
    keyId: preKey.keyId,
    publicKey: preKey.keyPair.pubKey,
  }

  directory.storeKeyBundle(name, {
    registrationId,
    identityPubKey: identityKeyPair.pubKey,
    signedPreKey: publicSignedPreKey,
    oneTimePreKeys: [publicPreKey],
  })

  return {
    publicPreKey,
    directory,
    store,
    address
  }
}


export default function App() {

  const [directory] = useState(new SignalDirectory())

  // 用户身份信息
  const [info, setInfo] = useState<any>()
  const [info2, setInfo2] = useState<any>()

  // 消息
  const [message1, setMessage1] = useState<string>('')
  const [message2, setMessage2] = useState<string>('')

  const [chats, setChats] = useState<any>([])
  const [newChats, setNewChats] = useState<any>([])

  const created = async () => {
    // 生成注册ID和密钥对
    const identity1 = await createIdentity('test', 'test', 1, directory)
    const identity2 = await createIdentity('test2', 'test2', 2, directory)

    setInfo(identity1)
    setInfo2(identity2)
    

    console.log("默认生成用户1:", identity1)
    console.log("默认生成用户2:", identity2)
  }

  const arrayBufferToString = (buffer: ArrayBuffer) => {
    const decoder = new TextDecoder()
    const text = decoder.decode(buffer)
    return text
  }

  const cretaeSession = async (user1: any, user2: any) => {
    // 生成会话 接收放的 name
    const bundle = directory.getPreKeyBundle(user2.address.name)
    console.log("bundle", bundle);

    // const obj = cloneDeep(bundle)
    // console.log("obj",obj);
    // for (const key in bundle) {
    //   // obj[key] = bundle[key]
    //   if(typeof bundle[key] === 'object') {
    //     for (const k in bundle[key]) {
    //       // 如果是 ArrayBuffer
    //       if (bundle[key][k] instanceof ArrayBuffer) {
    //         // 把 ArrayBuffer 转成字符串
    //         obj[key][k] = btoa(String.fromCharCode.apply(null, new Uint8Array(bundle[key][k])))
    //       }
    //     }
    //   } 

    //   if (bundle[key] instanceof ArrayBuffer) {
    //     // 把 ArrayBuffer 转成字符串
    //     obj[key] = btoa(String.fromCharCode.apply(null, new Uint8Array(bundle[key])))
    //   }
    // }
    // console.log("obj",obj);
    

    const address = new SignalProtocolAddress(user2.address.name, user2.address.deviceId)
    // const recipientAddress = user2.address;
    const recipientAddress = address

    // 为远程recipientId + deviceId元组实例化SessionBuilder。 发送方地址，接收放地址
    const sessionBuilder = new SessionBuilder(user1.store, recipientAddress)
    // console.log("sessionBuilder", sessionBuilder);

    // 处理从服务器获取的预密钥。返回一个解决的承诺
    // 一旦会话被创建并保存在商店中，或者如果会话被拒绝，
    // IdentityKey 与该地址之前看到的身份不同。
    // console.log("processing prekey");
    await sessionBuilder.processPreKey(bundle!)
  }

  //! 为用户生成一些基本信息，一般在注册时生成
  useEffect(() => { created() }, [])
  // useEffect(() => {create && cretaeSession(info,info2)}, [create])
  useEffect(() => {
    if (info) {
      // 解析客户端2的消息
      const cp1 = new SessionCipher(info2.store, info.address)
      // 解析客户端1的消息
      const cp2 = new SessionCipher(info.store, info2.address)

      // const newChats = JSON.parse(JSON.stringify(chats))

      const updateChats = async () => {
        const lastChats = chats.at(-1)
        if (lastChats.type === 'send') {
          lastChats.msg = await decode(lastChats.msg, cp1);
        } else {
          lastChats.msg = await decode(lastChats.msg, cp2);
        }

        // 修改 newChats 最后一个消息
        // newChats[newChats.length - 1] = lastChats

        // 现在，newChats 包含了所有解码后的消息`
        // setChats([...chats, lastChats])
        // console.log("newChats", newChats)
      }

      updateChats()

      // const newChats = chats.map((item) => {
      //   let msg = ''
      //   if (item.type === 'send') {
      //     msg =  decode(item.msg, cp1).then((res) => res)
      //   } else {
      //     msg = decode(item.msg, cp2).then((res) => res)
      //   }
      //   return {
      //     ...item,
      //     msg
      //   }
      // })
      // setNewChats(newChats)

      // console.log("newChats",newChats);
    }
  }, [chats])

  const sendMessage = async (msg: string, cipher: SessionCipher) => {
    // 把消息转为 ArrayBuffer
    const encoder = new TextEncoder()
    const buffer = encoder.encode(msg).buffer

    // 加密
    const ciphertext = await cipher.encrypt(buffer)

    //  const chat = {
    //    type: 'send',
    //    msg: ciphertext,
    //    time: new Date().toLocaleString(),
    //  }
    const ciph = {
      ...ciphertext,
      body: btoa(ciphertext.body!)
    }

    console.log("发送消息", ciph);

    return ciph
  }


  const sendMessage1 = async (msg: string) => {
    // 创建会话
    cretaeSession(info, info2)
    // 现在我们可以发送加密消息
    const sessionCipher = new SessionCipher(info.store, info2.address)

    console.log("sessionCipher",info.store,sessionCipher);
    

    const ciphertext = await sendMessage(msg, sessionCipher)

    const chat = {
      type: 'send',
      msg: ciphertext,
      time: new Date().toLocaleString(),
    }

    setChats([...chats, chat])
  }

  const sendMessage2 = async (msg: string) => {
    // 创建会话
    cretaeSession(info2, info)
    // 现在我们可以发送加密消息
    const sessionCipher = new SessionCipher(info2.store, info.address)

    const ciphertext = await sendMessage(msg, sessionCipher)

    const chat = {
      type: 'rend',
      msg: ciphertext,
      time: new Date().toLocaleString(),
    }

    setChats([...chats, chat])
  }

  const decode = async (msg: MessageType, cipher: SessionCipher) => {
    let plaintext: ArrayBuffer = new Uint8Array().buffer
    if (msg.type === 3) {
      plaintext = await cipher.decryptPreKeyWhisperMessage(atob(msg.body!), "binary")
    } else if (msg.type === 1) {
      plaintext = await cipher.decryptWhisperMessage(atob(msg.body!), "binary")
    }

    const stringPlaintext = new TextDecoder().decode(new Uint8Array(plaintext))

    console.log("解析前", msg.body!)
    console.log("解析后", stringPlaintext)

    return stringPlaintext
  }


  return <>
    {/*  1、注册或登录，生成唯一公私钥  */}
    <div className="app">
      <h2>生成身份</h2>
      <p className="app-text">客户端1注册🆔：{info?.publicPreKey.keyId}</p>
      <p className="app-text">客户端2注册🆔：{info2?.publicPreKey.keyId}</p>
      <hr />
      <h2>发送消息</h2>
      <div className="app-conatiner">

        <div className="app-item">
          客户端1：
          <Input
            placeholder="请输入消息"
            value={message1}
            onChange={(e) => setMessage1(e.target.value!)}
          />
          <Button onClick={() => sendMessage1(message1!)}>发送</Button>
        </div>

        <div className="app-item">
          客户端2：
          <Input
            placeholder="请输入消息"
            value={message2}
            onChange={(e) => setMessage2(e.target.value!)}
          />
          <Button onClick={() => sendMessage2(message2!)}>发送</Button>
        </div>
      </div>

      {/* 加密后的消息 */}
      <div className="chat-conatiner">
        {/* <h1>加密后的消息</h1> */}
        {
          chats && chats.map((item, index) => (
            <div className={item.type === 'send' ? 'app-text__right' : 'app-text__left'} key={index}>
              <p className="chat-msg">{item.msg.toString()}</p>
              <p className="chat-time">{item.time}</p>
            </div>
          ))
        }
      </div>
      <hr />
      {/* 解密后盾消息  */}
      {/* <div className="chat-conatiner">
        <h1>解密后的消息</h1>
        {
          newChats && newChats.map((item, index) => (
            <div className={item.type === 'send' ? 'app-text__right' : 'app-text__left'} key={index}>
              <p className="chat-msg">{item.msg.toString()}</p>
              <p className="chat-time">{item.time}</p>
            </div>
          ))
        }
      </div> */}
    </div>
  </>
}