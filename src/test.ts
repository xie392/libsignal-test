import React, { useState, useEffect } from "react";

import {
  KeyHelper,
  SignedPublicPreKeyType,
  SignalProtocolAddress,
  SessionBuilder,
  PreKeyType,
  SessionCipher,
  MessageType,
} from "@privacyresearch/libsignal-protocol-typescript";
import { SignalProtocolStore } from "./storage-type";
import { SignalDirectory } from "./signal-directory";

class Protocol {
    constructor() {

    }

    /**
     * 生成身份
     * @returns 
     */
    createIdentity() {
        const keyPair = KeyHelper.generateIdentityKeyPair();
        return keyPair;
    }


   private async createID(name: string, store: SignalProtocolStore) {
    const registrationId = KeyHelper.generateRegistrationId();
    // 将 RegistrationId 存储在持久且安全的地方...或者这样做。
    storeSomewhereSafe(store)(`registrationID`, registrationId);

    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    // 将 IdentityKeyPair 存储在持久且安全的地方......或者这样做。
    storeSomewhereSafe(store)("identityKey", identityKeyPair);

    const baseKeyId = Math.floor(10000 * Math.random());
    const preKey = await KeyHelper.generatePreKey(baseKeyId);
    store.storePreKey(`${baseKeyId}`, preKey.keyPair);

    const signedPreKeyId = Math.floor(10000 * Math.random());
    const signedPreKey = await KeyHelper.generateSignedPreKey(
      identityKeyPair,
      signedPreKeyId
    );
    store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
    const publicSignedPreKey: SignedPublicPreKeyType = {
      keyId: signedPreKeyId,
      publicKey: signedPreKey.keyPair.pubKey,
      signature: signedPreKey.signature,
    };

    // Now we register this with the server so all users can see them
    const publicPreKey: PreKeyType = {
      keyId: preKey.keyId,
      publicKey: preKey.keyPair.pubKey,
    };
    directory.storeKeyBundle(name, {
      registrationId,
      identityPubKey: identityKeyPair.pubKey,
      signedPreKey: publicSignedPreKey,
      oneTimePreKeys: [publicPreKey],
    });
    updateStory(createidMD);
  };
}