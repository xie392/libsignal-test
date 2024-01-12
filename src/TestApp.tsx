import { Button, Input } from "@material-ui/core"
import './App.css'
import React, { useEffect, useState } from 'react'
import { cloneDeep } from 'lodash-es'

// import SignalProtocol from "./protocol"

// import DB from "./db"
import { DeviceType, KeyHelper, MessageType, PreKeyType, SessionBuilder, SessionCipher, SignalProtocolAddress, SignedPublicPreKeyType } from "@privacyresearch/libsignal-protocol-typescript"
import { SignalProtocolStore } from "./storage-type"
import { SignalDirectory } from "./signal-directory"

class Signal {

    public directory: SignalDirectory = new SignalDirectory()

    // todo: 后续仓库可能需要修改，在添加时可以添加到 indexDB 中, 或者初始化的时候读取数据到仓库中
    public store: SignalProtocolStore = new SignalProtocolStore()

    /**
     * 创建身份
     * @param {string} name     这个用于标识 directory 的 key 值，建议用用户 id 或者 一个唯一的值
     * @returns 
     */
    async ceeateIdentity(name: string) {
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
            signature: signedPreKey.signature,
        }

        // 公共预密钥
        const publicPreKey: PreKeyType = {
            keyId: preKey.keyId,
            publicKey: preKey.keyPair.pubKey,
        }

        // 存储注册id 1129
        this.store.put(`registrationID`, registrationId)
        // 存储身份密钥
        this.store.put(`identityKey`, identityKeyPair)
        // 存储预密钥
        this.store.storePreKey(`${baseKeyId}`, preKey.keyPair)

        this.directory.storeKeyBundle(name, {
            registrationId,
            identityPubKey: identityKeyPair.pubKey,
            signedPreKey: publicSignedPreKey,
            oneTimePreKeys: [publicPreKey],
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
            base64: await this.toBase64(buffer)
        }
    }

    /**
     * 加密消息
     * @param {string} msg  要加密的消息
     * @param {SessionCipher} cipher    
     * @returns
     */
    async encrypt(msg: string, cipher: SessionCipher) {
        // 把消息转为 ArrayBuffer
        const buffer = new TextEncoder().encode(msg).buffer

        // 加密
        const ciphertext = await cipher.encrypt(buffer)

        const result = {
            ...ciphertext,
            // 把消息转为 base64
            body: btoa(ciphertext.body!)
        }

        return result
    }

    /**
     * 解密消息
     * @param {MessageType} msg  要解密的消息
     * @param {SessionCipher} cipher  
     * @returns {SessionCipher}
     */
    async decrypt(msg: MessageType, cipher: SessionCipher) {
        let plaintext: ArrayBuffer = new Uint8Array().buffer
        if (msg.type === 3) {
          plaintext = await cipher.decryptPreKeyWhisperMessage(atob(msg.body!), "binary")
        } else if (msg.type === 1) {
          plaintext = await cipher.decryptWhisperMessage(atob(msg.body!), "binary")
        }
    
        const stringPlaintext = new TextDecoder().decode(new Uint8Array(plaintext))
        return stringPlaintext
    }


    /**
     * uint8Array 转 base64
     * @param {ArrayBuffer} arr
     * @returns {string}
     */
    uint8ArrayToBase64(arr: ArrayBuffer) {
        // @ts-ignore base64 encode 
        return btoa(String.fromCharCode.apply(null, new Uint8Array(arr)))
    }

    /**
     * base64 转 ArrayBuffer
     * @param str 
     * @returns 
     */
    base64ArrayBuffer(str: string) {
        // 使用atob将Base64字符串转换为二进制字符串
        const binaryString = atob(str)

        // 创建一个Uint8Array视图
        const uint8Array = new Uint8Array(binaryString.length)

        // 将二进制字符串的每个字符转换为Uint8Array的元素
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i)
        }

        // 现在，uint8Array是包含解码后数据的Uint8Array
        const buffer = uint8Array.buffer

        return buffer
    }

    /**
     * 创建会话
     * @returns {Promise<IdentityType>}
     */
    async cretaeSession(userStore: SignalProtocolStore, recipientAddress: SignalProtocolAddress, bundle: DeviceType) {
        const sessionBuilder = new SessionBuilder(userStore, recipientAddress)
        await sessionBuilder.processPreKey(bundle)
    }

    /**
     * 把对象中的 ArrayBuffer 转 base64
     * @returns {Promise<IdentityType>}
     */
    async toBase64(obj: any, isClone: boolean = true) {
        const clone = isClone ? cloneDeep(obj) : obj
        Object.keys(clone).forEach(async (key) => {
            if (clone[key] instanceof ArrayBuffer) {
                clone[key] = await this.uint8ArrayToBase64(clone[key])
            }
            if (typeof clone[key] === "object") {
                this.toBase64(clone[key], false)
            }
        })
        return clone
    }

    /**
     * 把对象中的 base64 转 ArrayBuffer(33)
     * @returns {Promise<ArrayBuffer>}
     */
    async toArrayBuffer(obj: any, isClone: boolean = true) {
        const clone = isClone ? cloneDeep(obj) : obj
        Object.keys(clone).forEach(async key => {
            // 判断是否是 base64 字符
            if (typeof clone[key] === "string") {
                clone[key] = await this.base64ArrayBuffer(clone[key])
            }

            if (typeof clone[key] === "object") {
                this.toArrayBuffer(clone[key], false)
            }
        })

        return clone
    }
}

const DESKTOP = 'test1'

export default function App() {
    // 用户密钥信息，这些后面是从本地存储获取
    const [info, setInfo] = useState<any>({})

    // todo: 这里需要从本地存储获取，或者从 indexDB 获取
    //* 第一个参数为自己的 name，第二个参数为用户的 设备 id， 设备 id 必须是 number 类型
    const address = new SignalProtocolAddress(DESKTOP, 1)

    //* 1、创建 Signal
    const signal = new Signal()

    /**
     ** 2、生成身份信息，一般在注册时生成，保存到本地，包含有
     ** - 身份密钥对（Identity Key Pair）
     ** - 预共享密钥对（Prekey Pair）
     ** - 预共享密钥（Sending Prekeys）
     */
    const created = async () => {
        const inentity = await signal.ceeateIdentity(DESKTOP)
        console.log(inentity)
        setInfo(inentity)

        //! 这个函数后面应该直接变成第 2 布
        createSession()

        // todo: 这里可以做一些本地存储，把 inentity.base64 存储到本地
    }

    /**
     ** 3、初始化会话
     ** 当用户A要与用户B通信时，首先通过 Signal 服务器获取用户B的身份公钥和预共享密钥。
     */
    const createSession = async () => {
        // const store = new SignalProtocolStore()


        // todo: 这个 bundle 是从服务器获取的，或者 indexDB 获取
        // const bundle = signal.directory.getPreKeyBundle('directory目录的 key')
        const bundle = {
            "identityKey": "BVeK9SQrTU/ZcMcj7MAahQmbuc7OjaATZ3rhv2k0XlI+",
            "signedPreKey": {
                "keyId": 9661,
                "publicKey": "BbkGXRZm8/2zSzlDunveAkfh3ojFYFJ+bdvocejwCA9q",
                "signature": "ETGHY4OA8uJLWxA3qq61vdDGlX8JRuo6RGGMoBZatNnOrmBZuxc2s+41iVhkMwwYfzYEuzssty2spCH17o1lCg=="
            },
            "preKey": {
                "keyId": 536,
                "publicKey": "BYCR8XN36+Ta0OE8Ct0xNT1Azz40eBMXf5p0dn7X5tgX"
            },
            "registrationId": 12383
        }

        // 转会 ArrayBuffer 格式
        const newBundle = await signal.toArrayBuffer(bundle)

        await signal.cretaeSession(signal.store, address, newBundle)


        // 测试用户使用
        // const newBundleBase64= await signal.toBase64(signal.directory.getPreKeyBundle(DESKTOP))
        // const storeBase64 = await signal.toBase64(signal.store)
        
        // console.log("newBundleBase64",newBundleBase64)
        // console.log("stroe",storeBase64)

        // console.log("old stroe",signal.store)
        

        // 测试发送消息
        sendMessage("你好")


    }

    /**
     * 4、发送消息
     */
    const sendMessage = async (msg:string) => {
        const sessionCipher = new SessionCipher(signal.store, address)
        // 1. 加密
        const encrypted = await signal.encrypt(msg, sessionCipher)

        // todo: 发送消息
        console.log('发送消息：',encrypted)


    
        // 测试解密消息
        const address2 = new SignalProtocolAddress("test2", 2)
        const store = {
            "registrationID": 12383,
            "identityKey": {
                "pubKey": "BVeK9SQrTU/ZcMcj7MAahQmbuc7OjaATZ3rhv2k0XlI+",
                "privKey": "YEfAIFQJEmH/s2yBCDUtjYshcGLHX4+WA0yEG91Cm1Y="
            },
            "25519KeypreKey536": {
                "pubKey": "BYCR8XN36+Ta0OE8Ct0xNT1Azz40eBMXf5p0dn7X5tgX",
                "privKey": "cKFtXKaNXacrZuIC155EzN88CruKGNqHBTvrNQHudGs="
            },
            "sessiontest1.1": "{\"sessions\":{\"\\u0005;ùOoAåáL-}2oü\\u0002T&å3ó$QÞM\\u0006¦:Óz\\u0007s\":{\"indexInfo\":{\"closed\":-1,\"remoteIdentityKey\":\"BWr9fvVvvLPZFvUOc9VM0e9L9J7nSJhhFV/66mJkac0L\",\"baseKey\":\"BTv5T29B5eFMLX0yb/wCVCblM/MkUZbeTQamOtN6mQdz\",\"baseKeyType\":1},\"registrationId\":15459,\"currentRatchet\":{\"rootKey\":\"DISh6P/i7x86V5MPvU02daBaV+x/IOMvG9IqHJV04pY=\",\"ephemeralKeyPair\":{\"pubKey\":\"BROVdIwCX9kDKilrpdaPRbvR1vDYDF7dIraZ1AxO2f9i\",\"privKey\":\"mOlZhms927cIc7sQZj2fMCsQNDZwrEUhCiq1a2X8ymo=\"},\"lastRemoteEphemeralKey\":\"BRA0goSR2k5O3MldO6xoJtjIu/O+4VqA9TlSEh0SseBz\",\"previousCounter\":0},\"pendingPreKey\":{\"baseKey\":\"BTv5T29B5eFMLX0yb/wCVCblM/MkUZbeTQamOtN6mQdz\",\"preKeyId\":6117,\"signedKeyId\":8950},\"oldRatchetList\":[],\"chains\":{\"BROVdIwCX9kDKilrpdaPRbvR1vDYDF7dIraZ1AxO2f9i\":{\"chainType\":1,\"chainKey\":{\"key\":\"g13dvp+YJA07XLnmTZLjOEbMurJ/GIVOkF1oNGb8LzY=\",\"counter\":-1},\"messageKeys\":{}}}}},\"version\":\"v1\"}",
            "identityKeytest1": "BWr9fvVvvLPZFvUOc9VM0e9L9J7nSJhhFV/66mJkac0L"
        }
        const newStore = await signal.toArrayBuffer(store)
        const sessionCipher2 = new SessionCipher(newStore, address2)
        const decrypt = await signal.decrypt(encrypted,sessionCipher2)

        console.log("解密后",decrypt)
        
        
    }

    useEffect(() => { created() }, [])

    return (
        <>
            111
        </>
    )
}