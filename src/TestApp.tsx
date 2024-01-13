// import { Button, Input } from "@material-ui/core"
import './App.css'
import React, { useEffect, useState } from 'react'
// import { cloneDeep } from 'lodash-es'
import {  SessionCipher, SignalProtocolAddress } from "@privacyresearch/libsignal-protocol-typescript"
import Signal from "./signal-protocol"


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

        console.log("signal.store",signal.store);
        console.log("newBundle",newBundle);
        

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
        // const address2 = new SignalProtocolAddress("test2", 2)
        // const store = {
        //     "registrationID": 12383,
        //     "identityKey": {
        //         "pubKey": "BVeK9SQrTU/ZcMcj7MAahQmbuc7OjaATZ3rhv2k0XlI+",
        //         "privKey": "YEfAIFQJEmH/s2yBCDUtjYshcGLHX4+WA0yEG91Cm1Y="
        //     },
        //     "25519KeypreKey536": {
        //         "pubKey": "BYCR8XN36+Ta0OE8Ct0xNT1Azz40eBMXf5p0dn7X5tgX",
        //         "privKey": "cKFtXKaNXacrZuIC155EzN88CruKGNqHBTvrNQHudGs="
        //     },
        //     "sessiontest1.1": "{\"sessions\":{\"\\u0005;ùOoAåáL-}2oü\\u0002T&å3ó$QÞM\\u0006¦:Óz\\u0007s\":{\"indexInfo\":{\"closed\":-1,\"remoteIdentityKey\":\"BWr9fvVvvLPZFvUOc9VM0e9L9J7nSJhhFV/66mJkac0L\",\"baseKey\":\"BTv5T29B5eFMLX0yb/wCVCblM/MkUZbeTQamOtN6mQdz\",\"baseKeyType\":1},\"registrationId\":15459,\"currentRatchet\":{\"rootKey\":\"DISh6P/i7x86V5MPvU02daBaV+x/IOMvG9IqHJV04pY=\",\"ephemeralKeyPair\":{\"pubKey\":\"BROVdIwCX9kDKilrpdaPRbvR1vDYDF7dIraZ1AxO2f9i\",\"privKey\":\"mOlZhms927cIc7sQZj2fMCsQNDZwrEUhCiq1a2X8ymo=\"},\"lastRemoteEphemeralKey\":\"BRA0goSR2k5O3MldO6xoJtjIu/O+4VqA9TlSEh0SseBz\",\"previousCounter\":0},\"pendingPreKey\":{\"baseKey\":\"BTv5T29B5eFMLX0yb/wCVCblM/MkUZbeTQamOtN6mQdz\",\"preKeyId\":6117,\"signedKeyId\":8950},\"oldRatchetList\":[],\"chains\":{\"BROVdIwCX9kDKilrpdaPRbvR1vDYDF7dIraZ1AxO2f9i\":{\"chainType\":1,\"chainKey\":{\"key\":\"g13dvp+YJA07XLnmTZLjOEbMurJ/GIVOkF1oNGb8LzY=\",\"counter\":-1},\"messageKeys\":{}}}}},\"version\":\"v1\"}",
        //     "identityKeytest1": "BWr9fvVvvLPZFvUOc9VM0e9L9J7nSJhhFV/66mJkac0L"
        // }
        // const newStore = await signal.toArrayBuffer(store)
        // const sessionCipher2 = new SessionCipher(newStore, address2)
        // const decrypt = await signal.decrypt(encrypted,sessionCipher2)

        // console.log("解密后",decrypt)
        
        
    }

    useEffect(() => { created() }, [])

    return (
        <>
            
        </>
    )
}