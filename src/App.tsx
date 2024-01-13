import { useEffect, useState } from 'react'
import './App.css'
import { Button, TextField } from "@material-ui/core"

import Signal from "./signal-protocol"
import { SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript'

import { cloneDeep } from 'lodash-es'
import MarkdownPreview from '@uiw/react-markdown-preview'
import processMarkdown from './process.md?raw'

const DESKTOP1 = 'test1'
const DESKTOP2 = 'test2'

function App() {
  // 创建实例 
  const [signal1] = useState(new Signal())
  const [signal2] = useState(new Signal())

  // 身份信息
  const [desktop1, setDesktop1] = useState<any>({})
  const [desktop2, setDesktop2] = useState<any>({})

  // 地址
  const [address1] = useState(new SignalProtocolAddress(DESKTOP1, 1))
  const [address2] = useState(new SignalProtocolAddress(DESKTOP2, 2))

  // 会话 session
  const [sessionCipher1] = useState<SessionCipher>(new SessionCipher(signal1.store, address2))
  const [sessionCipher2] = useState<SessionCipher>(new SessionCipher(signal2.store, address2))

  // 消息
  const [msg1, setMsg1] = useState<string>('')
  const [msg2, setMsg2] = useState<string>('')

  // 加密的消息
  const [message, setMessage] = useState<any>([])
  // 解密后的消息
  const [chats, setChats] = useState<any>([])

  // 初始化
  async function init() {
    const desktop1 = await signal1.ceeateIdentity(DESKTOP1)
    const desktop2 = await signal2.ceeateIdentity(DESKTOP2)

    setDesktop1(desktop1)
    setDesktop2(desktop2)

    console.log("%c第一步:", "color:#f36;font-size:24px;")
    console.info("为客户端1生成身份：", desktop1)
    console.info("为客户端2生成身份：", desktop2)


    //* 生成个人信息后，把 bundle 暴露出
    const bundle1Buffer = signal1.directory.getPreKeyBundle(DESKTOP1)
    const bundle2Buffer = signal2.directory.getPreKeyBundle(DESKTOP2)

    // *建立会话
    await signal1.cretaeSession(signal1.store, address2, bundle2Buffer!)
    await signal2.cretaeSession(signal2.store, address1, bundle1Buffer!)

    console.log("%c第二步:", "color:#f36;font-size:24px;")
    console.info("与客户端2建立会话")
    console.info("与客户端1建立会话")
  }

  useEffect(() => { init() }, [])

  const sendMessage1 = async () => {

    const encrypted = await signal1.encrypt(msg1, sessionCipher1!)

    console.log("客户端2发送消息：", encrypted)

    const res = {
      msg: encrypted,
      time: new Date().toLocaleString(),
      type: 'send'
    }

    setMessage([...message, res])
    setMsg1('')

    const chatList = cloneDeep(chats)
    chatList.push(res)
    setChats(chatList)

    // 客户端2解密
    // if (encrypted) {
    //   const decrypted = await signal2.decrypt(encrypted, sessionCipher2!)
    //   console.log("客户端2解密", decrypted)
    // }
  }

  const sendMessage2 = async () => {
    const encrypted = await signal2.encrypt(msg2, sessionCipher2!)

    console.log("客户端1发送消息：", encrypted)

    const res = {
      msg: encrypted,
      time: new Date().toLocaleString(),
      type: 'receive'
    }

    setMessage([...message, res])
    setMsg2('')

    const chatList = cloneDeep(chats)
    chatList.push(res)
    setChats(chatList)

    // 客户端1解密
    // if (encrypted) {
    //   const decrypted = await signal2.decrypt(encrypted, sessionCipher1!)
    //   console.log("客户端1解密", decrypted)
    // }
  }

  // 解密
  useEffect(() => {
    const decrypt = async () => {
      const newChats = cloneDeep(chats)
      const lastChats = newChats.at(-1)

      if (lastChats.type === 'send') {
        lastChats.msg.body = await signal1.decrypt(lastChats.msg, sessionCipher2!)
      } else {
        lastChats.msg.body = await signal2.decrypt(lastChats.msg, sessionCipher1!)
      }
      setChats(newChats)
    }
    if (chats.length > 0) {
      decrypt()
    }
  }, [message])

  return (
    <div className="app">
      <div className="app-item">

        <div className="app-item-gird">
          <h1>客户端1</h1>
          <p>客户端1的注册ID：{desktop1?.base64?.registrationId}</p>
          <div className='chat'>
            <TextField
              size="small"
              label="消息"
              variant="outlined"
              style={{ flex: 1 }}
              value={msg1}
              onChange={(e) => setMsg1(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={sendMessage1}>发送消息</Button>
          </div>

          <br />

          <h1>客户端2</h1>
          <p>客户端2的注册ID：{desktop2?.base64?.registrationId}</p>
          <div className='chat'>
            <TextField
              size="small"
              label="消息"
              variant="outlined"
              style={{ flex: 1 }}
              value={msg2}
              onChange={(e) => setMsg2(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={sendMessage2}>发送消息</Button>
          </div>
        </div>

        <div className="app-item-gird">
          <MarkdownPreview source={processMarkdown} />
        </div>
      </div>

      <div className="app-item">

        <div className="app-item-gird">
          {message.length !== 0 && (<h1>加密后的消息</h1>)}
          {
            message.map((item: any, index: number) => {
              return (
                <div key={index} className="app-text">
                  <div className={item.type === 'send' ? 'app-text__right' : 'app-text__left'}>
                    <p>{item.msg?.body}</p>
                  </div>
                </div>
              )
            })
          }
        </div>

        <div className="app-item-gird">
          {chats.length !== 0 && (<h1>解密后的消息</h1>)}
          {
            chats.map((item: any, index: number) => {
              return (
                <div key={index} className="app-text">
                  <div className={item.type === 'send' ? 'app-text__right' : 'app-text__left'}>
                    <p>{item.msg?.body}</p>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  );
}

export default App;
