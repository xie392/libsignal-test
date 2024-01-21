import {
	SignedPublicPreKeyType,
	PreKeyType,
	KeyHelper,
	SignalProtocolAddress,
	SessionCipher,
	MessageType,
	SessionBuilder,
} from '@privacyresearch/libsignal-protocol-typescript'
import { SignalProtocolStore } from './storage-type'
import { SignalDirectory } from './signal-directory'
import { encode, decode } from 'js-base64'

/**
 * 创建身份
 */
async function ceeateIdentity(
	name: string
): Promise<{ store: SignalProtocolStore; directory: SignalDirectory; buffer: any }> {
	// 创建一个仓库
	const store = new SignalProtocolStore()
	// 目录
	const directory = new SignalDirectory()

	// 生成一个注册id
	const registrationId = KeyHelper.generateRegistrationId()

	// 生成身份密钥对
	const identityKeyPair = await KeyHelper.generateIdentityKeyPair()

	// 生成一个预共享密钥
	const baseKeyId = Math.floor(10000 * Math.random())

	// 存储预密钥
	const preKey = await KeyHelper.generatePreKey(baseKeyId)

	// 随机生成一个签名密钥 id
	const signedPreKeyId = Math.floor(10000 * Math.random())

	// 生成签名密钥
	const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, signedPreKeyId)

	// 公共签名预密钥
	const publicSignedPreKey: SignedPublicPreKeyType = {
		keyId: signedPreKeyId,
		publicKey: signedPreKey.keyPair.pubKey,
		signature: signedPreKey.signature
	}

	// 公共预密钥
	const publicPreKey: PreKeyType = {
		keyId: preKey.keyId,
		publicKey: preKey.keyPair.pubKey
	}

	// 存储注册id 1129
	store.put(`registrationID`, registrationId)
	// 存储身份密钥
	store.put(`identityKey`, identityKeyPair)
	// 存储预密钥
	store.storePreKey(`${baseKeyId}`, preKey.keyPair)
	// 存储签名密钥
	store.storeSignedPreKey(`${signedPreKeyId}`, signedPreKey.keyPair)

	directory.storeKeyBundle(name, {
		registrationId,
		identityPubKey: identityKeyPair.pubKey,
		signedPreKey: publicSignedPreKey,
		oneTimePreKeys: [publicPreKey]
	})

	const buffer = {
		registrationId,
		identityKeyPair,
		publicPreKey,
		publicSignedPreKey,
		signedPreKeyId
	}

	return {
		buffer,
		store,
		directory
	}
}

/**
 * 加密消息
 * @param {string} msg  要加密的消息
 * @param {SessionCipher} cipher
 * @returns
 */
async function encrypt(msg: string, cipher: SessionCipher) {
	// 把消息转为 ArrayBuffer
	const buffer = new TextEncoder().encode(msg).buffer

	// 加密
	const ciphertext = await cipher.encrypt(buffer)

	const result = {
		...ciphertext,
		// 把消息转为 base64
		body: encode(ciphertext.body!)
	}

	return result
}

/**
 * 解密消息
 * @param {MessageType} msg  要解密的消息
 * @param {SessionCipher} cipher
 * @returns {SessionCipher}
 */
async function decrypt(msg: MessageType, cipher: SessionCipher) {
	let plaintext: ArrayBuffer = new Uint8Array().buffer

	if (msg.type === 3) {
		plaintext = await cipher.decryptPreKeyWhisperMessage(decode(msg.body!), 'binary')
	} else if (msg.type === 1) {
		plaintext = await cipher.decryptWhisperMessage(decode(msg.body!), 'binary')
	}
	const stringPlaintext = new TextDecoder().decode(new Uint8Array(plaintext))

	return stringPlaintext
}

// 生成随机对称密钥
async function generateSymmetricKey(): Promise<CryptoKey> {
	try {
		const key = await crypto.subtle.generateKey(
			{
				name: 'AES-GCM',
				length: 256
			},
			true,
			['encrypt', 'decrypt']
		)
		return key
	} catch (error) {
		console.error('Error generating symmetric key:', error)
		throw error
	}
}

// 加密数据
async function encryptData(key: CryptoKey, plaintext: string, iv: Uint8Array): Promise<ArrayBuffer> {
	try {
		const encodedText = new TextEncoder().encode(plaintext)
		// const iv = crypto.getRandomValues(new Uint8Array(12))
		const ciphertext = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv
			},
			key,
			encodedText
		)
		return ciphertext
	} catch (error) {
		console.error('Error encrypting data:', error)
		throw error
	}
}

// 解密数据
async function decryptData(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
	try {
		const decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv
			},
			key,
			ciphertext
		)
		const decryptedText = new TextDecoder().decode(decrypted)
		return decryptedText
	} catch (error) {
		console.error('Error decrypting data:', error)
		throw error
	}
}

export async function run() {
	// const aliceIdentityKeyPair = KeyHelper.generateIdentityKeyPair()
	// const bobIdentityKeyPair = KeyHelper.generateIdentityKeyPair()

	// // 创建 Alice 和 Bob 的一次性密钥对
	// const aliceSessionBuilder = new SessionBuilder(aliceIdentityKeyPair, bobIdentityKeyPair)
	// const bobSessionBuilder = new SessionBuilder(bobIdentityKeyPair, aliceIdentityKeyPair)

	// // Alice 发送消息给 Bob
	// const aliceMessage = 'Hello, Bob!'
	// const aliceCiphertextMessage = aliceSessionBuilder.encrypt(aliceMessage)

	// // Bob 接收并解密消息
	// const bobDecryptedMessage = bobSessionBuilder.decrypt(aliceCiphertextMessage)
	// console.log('Bob received message:', bobDecryptedMessage)

	const DESKTOP1 = 'test1'
	const DESKTOP2 = 'test2'

	// 创建身份
	const desktop1 = await ceeateIdentity(DESKTOP1)
	const desktop2 = await ceeateIdentity(DESKTOP2)

	console.log(
		'%c \n' +
			'================================================================ \n' +
			'第一步：创建身份 \n' +
			'================================================================ \n',
		'color:red; font-size: 20px;'
	)
	console.log('desktop1', desktop1)
	console.log('desktop2', desktop2)

	// 创建地址
	const desktop1Address = new SignalProtocolAddress(DESKTOP1, 1)
	const desktop2Address = new SignalProtocolAddress(DESKTOP2, 2)

	console.log(
		'%c \n' +
			'================================================================ \n' +
			'第二步：创建地址 \n' +
			'================================================================ \n',
		'color:red; font-size: 20px;'
	)
	console.log('desktop1Address', desktop1Address)
	console.log('desktop2Address', desktop2Address)

	// 创建会话
	const desktop1Cipher = new SessionCipher(desktop1.store, desktop2Address)
	const desktop2Cipher = new SessionCipher(desktop2.store, desktop1Address)

	// 创建会话密钥
	const desktop1Bundle = desktop1.directory.getPreKeyBundle(DESKTOP1)
	const desktop2Bundle = desktop2.directory.getPreKeyBundle(DESKTOP2)

	const desktop1Builder = new SessionBuilder(desktop1.store, desktop2Address)
	const desktop2Builder = new SessionBuilder(desktop2.store, desktop1Address)

	const desktop1Session = await desktop1Builder.processPreKey(desktop2Bundle!)
	const desktop2Session = await desktop2Builder.processPreKey(desktop1Bundle!)

	console.log('desktop1', desktop1.store)
	console.log('desktop2', desktop2.store)

	console.log(
		'%c \n' +
			'================================================================ \n' +
			'第三步：创建会话密钥 \n' +
			'================================================================ \n',
		'color:red; font-size: 20px; text-align: center;'
	)
	console.log('desktop1Builder', desktop1Session)
	console.log('desktop2Builder', desktop2Session)

	// 加密消息
	const msg1 = 'hello world'
	const msg2 = 'I love you'

	const desktop1Msg = await encrypt(msg1, desktop1Cipher)
	const desktop2Msg = await encrypt(msg2, desktop2Cipher)

	console.log(
		'%c \n' +
			'================================================================ \n' +
			'第四步：加密消息 \n' +
			'================================================================ \n',
		'color:red; font-size: 20px; text-align: center;'
	)
	console.log('desktop1Msg', desktop1Msg)
	console.log('desktop2Msg', desktop2Msg)

	const desktop1Plaintext = await decrypt(desktop1Msg, desktop2Cipher)
	const desktop2Plaintext = await decrypt(desktop2Msg, desktop1Cipher)

	console.log(
		'%c \n' +
			'================================================================ \n' +
			'第五步：解密消息 \n' +
			'================================================================ \n',
		'color:red; font-size: 20px; text-align: center;'
	)
	console.log('解密客户端2消息', desktop1Plaintext)
	console.log('解密客户端1消息', desktop2Plaintext)

	try {
		// 生成对称密钥
		const symmetricKey = await generateSymmetricKey()

		console.log('生成对称密钥', symmetricKey)

		// 要加密的数据
		const plaintext = 'Hello, World!'
		// 使用相同的 IV
		const iv = crypto.getRandomValues(new Uint8Array(12))

		console.log(iv)

		// 加密数据
		const ciphertext = await encryptData(symmetricKey, plaintext, iv)
		console.log('加密数据:', ciphertext)

		// 解密数据
		const decryptedText = await decryptData(symmetricKey, ciphertext, iv)
		console.log('解密数据 Text:', decryptedText)
	} catch (error) {
		console.error('发生错误', error)
	}
}
