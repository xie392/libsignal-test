import { Button, Input } from "@material-ui/core"
import './App.css'
import React, { useEffect, useState } from 'react'
import { cloneDeep } from 'lodash-es'

// import SignalProtocol from "./protocol"

// import DB from "./db"
import { DeviceType, KeyHelper, MessageType, PreKeyType, SessionBuilder, SessionCipher, SignalProtocolAddress, SignedPublicPreKeyType } from "@privacyresearch/libsignal-protocol-typescript"
import { SignalProtocolStore } from "./storage-type"
import { SignalDirectory } from "./signal-directory"

class SignalStore {
    constructor() {

    }
}


class Signal {
    /**
     * 创建身份
     * @returns 
     */
    async ceeateIdentity() {
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
        const signedPreKey = await KeyHelper.generateSignedPreKey(
            identityKeyPair,
            signedPreKeyId
        )

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

        return {
            buffer: {
                registrationId,
                identityKeyPair,
                publicPreKey,
                publicSignedPreKey,
            },
            base64: {
                registrationId,
                identityKeyPair: {
                    pubKey: this.uint8ArrayToBase64(preKey.keyPair.pubKey),
                    privKey: this.uint8ArrayToBase64(preKey.keyPair.privKey),
                },
                publicSignedPreKey: {
                    ...publicSignedPreKey,
                    publicKey: this.uint8ArrayToBase64(publicSignedPreKey.publicKey),
                    signature: this.uint8ArrayToBase64(publicSignedPreKey.signature),
                },
                publicPreKey: {
                    ...publicPreKey,
                    publicKey: this.uint8ArrayToBase64(publicPreKey.publicKey),
                }
            }
        }
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
     * base64 转 uint8Array
     * @param str 
     * @returns 
     */
    base64ToUint8Array(str: string) {
        return Uint8Array.from(atob(str), c => c.charCodeAt(0))
    }

    /**
     * 创建会话
     * @returns {Promise<IdentityType>}
     */
    async cretaeSession(userStore: SignalProtocolStore, recipientAddress: SignalProtocolAddress,bundle:DeviceType) {
        const sessionBuilder = new SessionBuilder(userStore, recipientAddress)
        await sessionBuilder.processPreKey(bundle)
    }
}

const ceeateIdentity = async () => {
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
    const signedPreKey = await KeyHelper.generateSignedPreKey(
        identityKeyPair,
        signedPreKeyId
    )

    const publicSignedPreKey: SignedPublicPreKeyType = {
        keyId: signedPreKeyId,
        publicKey: signedPreKey.keyPair.pubKey,
        signature: signedPreKey.signature,
    }

    const publicPreKey: PreKeyType = {
        keyId: preKey.keyId,
        publicKey: preKey.keyPair.pubKey,
    }

    return {
        registrationId,
        identityKeyPair,
        publicPreKey,
        publicSignedPreKey,
    }
}

export default function App() {
    const signal = new Signal()
    const created = async () => {
        const inentity = await signal.ceeateIdentity()
        console.log(inentity)
    }

    useEffect(() => { created() })

    return (
        <>
            111
        </>
    )
}