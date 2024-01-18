import { useEffect, useState } from 'react'
import './App.css'
import { Button, TextField } from '@material-ui/core'

import Signal, { toBase64, toArrayBuffer } from './signal-protocol'
import { SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript'

import { cloneDeep } from 'lodash-es'
import MarkdownPreview from '@uiw/react-markdown-preview'
import processMarkdown from './process.md?raw'
import { SignalProtocolStore } from './storage-type'

const DESKTOP1 = 'test1'
const DESKTOP2 = 'test2'

/**
 * 实现端对端加密你需要持久化以下信息
 * 1、身份状态。客户端需要维护自己的身份密钥对以及从其他客户端收到的身份密钥的状态。
 * 2预密钥状态。客户端需要维护其生成的 PreKey 的状态。
 * 3、已签署 PreKey 状态。客户需要维护其签名的 PreKey 的状态。
 * 4、会话状态。客户端需要维护他们已建立的会话的状态。
 * @returns 
 */
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
	const [sessionCipher1, setSessionCipher1] = useState<SessionCipher>(new SessionCipher(signal1.store, address2))
	const [sessionCipher2, setSessionCipher2] = useState<SessionCipher>(new SessionCipher(signal2.store, address1))

	// 消息
	const [msg1, setMsg1] = useState<string>('')
	const [msg2, setMsg2] = useState<string>('')

	// 加密的消息
	const [message, setMessage] = useState<any>(JSON.parse(localStorage.getItem('message')! || '[]') || [])
	// 解密后的消息
	const [chats, setChats] = useState<any>(JSON.parse(localStorage.getItem('chats')! || '[]') || [])

	// 初始化
	async function init() {
		// 判断本地是否已经有了会话
		const sessionState1 = localStorage.getItem('sessionState1') as string
		const sessionState2 = localStorage.getItem('sessionState2') as string
		const desktopState1 = localStorage.getItem('desktop1') as string
		const desktopState2 = localStorage.getItem('desktop2') as string

		if (sessionState1) {
			setDesktop1(JSON.parse(desktopState1))
			setDesktop2(JSON.parse(desktopState2))

			console.log('toArrayBuffer(JSON.parse(sessionState1)', toArrayBuffer(JSON.parse(sessionState1)))

			const store1 = new SignalProtocolStore(toArrayBuffer(JSON.parse(sessionState1)))
			const store2 = new SignalProtocolStore(toArrayBuffer(JSON.parse(sessionState2)))

			signal1.updateStore(store1)
			signal2.updateStore(store2)

			const cipher1 = new SessionCipher(signal1.store, address2)
			const cipher2 = new SessionCipher(signal2.store, address1)

			setSessionCipher1(cipher1)
			setSessionCipher2(cipher2)
			return
		}

		const desktop1 = await signal1.ceeateIdentity(DESKTOP1)
		const desktop2 = await signal2.ceeateIdentity(DESKTOP2)

		setDesktop1(desktop1)
		setDesktop2(desktop2)

		console.log('%c第一步:', 'color:#f36;font-size:24px;')
		console.info('为客户端1生成身份：', desktop1)
		console.info('为客户端2生成身份：', desktop2)

		//* 生成个人信息后，把 bundle 暴露出
		const bundle1Buffer = signal1.directory.getPreKeyBundle(DESKTOP1)
		const bundle2Buffer = signal2.directory.getPreKeyBundle(DESKTOP2)

		// *建立会话
		await signal1.cretaeSession(signal1.store, address2, bundle2Buffer!)
		await signal2.cretaeSession(signal2.store, address1, bundle1Buffer!)

		console.log('%c第二步:', 'color:#f36;font-size:24px;')
		console.info('与客户端2建立会话')
		console.info('与客户端1建立会话')

		//* 持久化会话
		localStorage.setItem('sessionState1', JSON.stringify(toBase64(signal1.store)))
		localStorage.setItem('sessionState2', JSON.stringify(toBase64(signal2.store)))
		localStorage.setItem('desktop1', JSON.stringify(toBase64(desktop1)))
		localStorage.setItem('desktop2', JSON.stringify(toBase64(desktop2)))

		console.log('持久化会话', toBase64(signal1.store), sessionCipher2)
	}

	useEffect(() => {
		init()
	}, [])

	const sendMessage1 = async () => {
		console.log('sessionCipher1', sessionCipher1)

		const encrypted = await signal1.encrypt(msg1, sessionCipher1!)

		console.log('客户端2发送消息：', encrypted)

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

		console.log('客户端1发送消息：', encrypted)

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
			console.log('chats', chats)

			const newChats = cloneDeep(chats)
			const lastChats = newChats.at(-1)
			if (lastChats.type === 'send') {
				// 客户端1解密
				// const sessionCipher = new SessionCipher(signal2.store, address1)
				lastChats.msg.body = await signal1.decrypt(lastChats.msg, sessionCipher2!)
			} else {
				lastChats.msg.body = await signal2.decrypt(lastChats.msg, sessionCipher1!)
			}
			setChats(newChats)
			localStorage.setItem('message', JSON.stringify(message))
			localStorage.setItem('chats', JSON.stringify(newChats))
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
					<div className="chat">
						<TextField
							size="small"
							label="消息"
							variant="outlined"
							style={{ flex: 1 }}
							value={msg1}
							onChange={(e) => setMsg1(e.target.value)}
						/>
						<Button variant="contained" color="primary" onClick={sendMessage1}>
							发送消息
						</Button>
					</div>

					<br />

					<h1>客户端2</h1>
					<p>客户端2的注册ID：{desktop2?.base64?.registrationId}</p>
					<div className="chat">
						<TextField
							size="small"
							label="消息"
							variant="outlined"
							style={{ flex: 1 }}
							value={msg2}
							onChange={(e) => setMsg2(e.target.value)}
						/>
						<Button variant="contained" color="primary" onClick={sendMessage2}>
							发送消息
						</Button>
					</div>
				</div>

				<div className="app-item-gird">
					<MarkdownPreview source={processMarkdown} />
				</div>
			</div>

			<div className="app-item">
				<div className="app-item-gird">
					{message.length !== 0 && <h1>加密后的消息</h1>}
					{message.map((item: any, index: number) => {
						return (
							<div key={index} className="app-text">
								<div className={item.type === 'send' ? 'app-text__right' : 'app-text__left'}>
									<p>{item.msg?.body}</p>
								</div>
							</div>
						)
					})}
				</div>

				<div className="app-item-gird">
					{chats.length !== 0 && <h1>解密后的消息</h1>}
					{chats.map((item: any, index: number) => {
						return (
							<div key={index} className="app-text">
								<div className={item.type === 'send' ? 'app-text__right' : 'app-text__left'}>
									<p>{item.msg?.body}</p>
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}

export default App
