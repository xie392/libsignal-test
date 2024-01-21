import { encode, fromUint8Array, toUint8Array, decode } from 'js-base64'

// 生成密钥对，用于密钥交换
async function generateKeyPair(): Promise<CryptoKeyPair> {
	return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
}

// 执行密钥交换，得到共享的对称密钥
async function performKeyExchange(myKeyPair: CryptoKeyPair, theirPublicKey: CryptoKey): Promise<CryptoKey> {
	try {
		// 使用对方的公钥和自己的私钥进行 Diffie-Hellman 密钥交换
		const sharedSecret = await crypto.subtle.deriveKey(
			{ name: 'ECDH', public: theirPublicKey },
			myKeyPair.privateKey,
			{ name: 'AES-GCM', length: 256 },
			true,
			['encrypt', 'decrypt']
		)

		return sharedSecret
	} catch (error) {
		console.error('执行密钥交换时出错:', error)
		throw error
	}
}

// 加密消息
async function encryptMessage(actualKey: CryptoKey, plaintext: string): Promise<ArrayBuffer> {
	try {
		const encodedText = new TextEncoder().encode(plaintext)

		// 随机生成一个 IV
		const iv = crypto.getRandomValues(new Uint8Array(12))

		// 使用 AES-GCM 进行加密
		const ciphertext = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			actualKey,
			encodedText
		)

		// 将 IV 附加到加密的消息中，用于解密
		const result = new Uint8Array(ciphertext.byteLength + iv.byteLength)
		result.set(new Uint8Array(ciphertext), 0)
		result.set(iv, ciphertext.byteLength)

		return result.buffer
	} catch (error) {
		console.error('Error encrypting message:', error)
		throw error
	}
}

// 解密消息
async function decryptMessage(actualKey: CryptoKey, encryptedMessage: ArrayBuffer): Promise<string> {
	try {
		// 从加密的消息中提取 IV
		const iv = new Uint8Array(encryptedMessage.slice(-12))

		// 提取实际的加密数据
		const ciphertext = encryptedMessage.slice(0, encryptedMessage.byteLength - 12)

		// 使用 AES-GCM 进行解密
		const decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: iv
			},
			actualKey,
			ciphertext
		)

		const decryptedText = new TextDecoder().decode(decrypted)
		return decryptedText
	} catch (error) {
		console.error('Error decrypting message:', error)
		throw error
	}
}

// 示例代码
export async function run() {
	try {
		// Alice生成密钥对并发送公钥给Bob。
		// Bob生成密钥对并发送公钥给Alice。

		// 给用户生成密钥对
		const myKeyPair = await generateKeyPair()
		const theirPair = await generateKeyPair()

		// 执行密钥交换，得到共享的对称密钥
		const sharedKey = await performKeyExchange(myKeyPair, theirPair.publicKey)

		// 导出密钥
		const exportedKey = await crypto.subtle.exportKey('jwk', myKeyPair.privateKey)
		const base64 = encode(JSON.stringify(exportedKey))
		console.log('exportedKey', exportedKey,base64)

		const key = JSON.parse(decode(base64))
		console.log("jey",key);
		

		// =========================================================================
		

		// 导出共享密钥
		// const exportedKey = await crypto.subtle.exportKey('raw', sharedKey)
		// // 转为 base64
		// const exportedKeyBase64 = fromUint8Array(new Uint8Array(exportedKey))
		// // 转回 Uint8Array
		// const sharedKeyUint8Array = toUint8Array(exportedKeyBase64).buffer
		// const sharedKeyArray = await crypto.subtle.importKey(
		// 	'raw',
		// 	sharedKeyUint8Array,
		// 	{ name: 'AES-GCM', length: 256 },
		// 	true,
		// 	['encrypt', 'decrypt']
		// )
		// console.log('sharedKeyArray', sharedKeyArray)

		// =========================================================================

		// 转为 base6
		// const exportedPublicKey = await crypto.subtle.exportKey('spki', myKeyPair.publicKey)
		// const exportedKeyBase64 = fromUint8Array(new Uint8Array(exportedPublicKey))

		// const theirPublicy = await crypto.subtle.importKey(
		// 	'spki',
		// 	toUint8Array(exportedKeyBase64).buffer,
		// 	{ name: 'ECDH', namedCurve: 'P-256' },
		// 	true,
		// 	[]
		// )

		// console.log("theirPublicy",theirPublicy);

		// 要发送的明文消息
		const plaintextMessage = 'Hello, encrypted world!'

		// 加密消息
		const encryptedMessage = await encryptMessage(sharedKey, plaintextMessage)
		console.log('加密后的消息:', encryptedMessage)

		// 模拟发送消息给对方，对方接收到消息后进行解密
		const receivedPlaintext = await decryptMessage(sharedKey, encryptedMessage)
		console.log('解密后的消息:', receivedPlaintext)

		// 密钥派发，派生出用于加密和解密的实际密钥
		// const actualKey = await deriveActualKeyFromSharedSecret(sharedSecret)

		// 导出公钥给对方
		// const exportedPublicKey = await crypto.subtle.exportKey('spki', myKeyPair.publicKey)
		// const base64 = fromUint8Array(new Uint8Array(exportedPublicKey))
		// const buffer = toUint8Array(base64).buffer
		// console.log('fromUint8Array', exportedPublicKey, buffer, base64)
		// const theirPublicKey = await crypto.subtle.exportKey('spki', theirPair.publicKey)
		// const theirPublicy = await crypto.subtle.importKey(
		// 	'spki',
		// 	theirPublicKey,
		// 	{ name: 'ECDH', namedCurve: 'P-256' },
		// 	true,
		// 	[]
		// )
		// console.log(theirPublicy,theirPair.publicKey);
		// console.log(actualKey)

		// const plaintext = '你好，这是一条加密的消息。'
		// const encryptedMessage = await encryptMessage(actualKey, plaintext)
		// console.log('加密后的消息:', encryptedMessage)

		// const decryptedMessage = await decryptMessage(actualKey, encryptedMessage)
		// console.log('解密后的消息:', decryptedMessage)

		// 生成密钥对
		// const keyPair = await generateKeyPair()
		// // 导出公钥
		// // const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
		// const publicKey2 = await crypto.subtle.exportKey('jwk', keyPair2.publicKey)

		// const theirPublicKey = await crypto.subtle.importKey(
		// 	'jwk',
		// 	{ ...publicKey2, key_ops: ['deriveKey'] },
		// 	// myPublicKey,
		// 	{ name: 'ECDH', namedCurve: 'P-256' },
		// 	true,
		// 	['deriveKey', 'deriveBits']
		// )
		// console.log('导出的公钥:', publicKey2)

		// // 密钥交换，得到共享的对称密钥
		// const sharedSecret = await performKeyExchange(keyPair, theirPublicKey)

		// console.log('交换密钥:', sharedSecret)

		// //  使用共享的对称密钥派生实际的加密解密密钥
		// const actualKey = await deriveActualKeyFromSharedSecret(sharedSecret)

		// console.log('派生的密钥:', actualKey)

		// 要发送的明文消息
		// const plaintextMessage = 'Hello, encrypted world!'

		// // 加密消息
		// const encryptedMessage = await encryptMessage(keyPair, plaintextMessage)
		// console.log('加密后的消息:', encryptedMessage)

		// // 模拟发送消息给对方，对方接收到消息后进行解密
		// const receivedPlaintext = await decryptMessage(keyPair, encryptedMessage)
		// console.log('解密后的消息:', receivedPlaintext)
	} catch (error) {
		console.error('发生错误', error)
	}
}
