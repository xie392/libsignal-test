import {
    KeyHelper,
    SignedPublicPreKeyType,
    SignalProtocolAddress,
    SessionBuilder,
    PreKeyType,
    SessionCipher,
    MessageType,
  } from "@privacyresearch/libsignal-protocol-typescript";
import {SignalProtocolStore} from "./storage-type";
import DB from "./db"

/**
 * @description
 * 此类是 libsignal-protocol-typescript 库的包装器。
 * 提供了更加用户友好的界面。
 */
export default class SignalProtocol {

    db: typeof DB;

    constructor() {
      this.db = DB;
    }

    /**
     * 创建地址
     * @param identifier        用户名
     * @param deviceName        设备名称
     */
    createAddress(identifier: string, deviceName: number): SignalProtocolAddress {
        return new SignalProtocolAddress(identifier, deviceName);
    }

    /**
     * 创建仓库
     * @returns {SignalProtocolStore}
     */
    createStore(): SignalProtocolStore {
        return new SignalProtocolStore();
    }

    /**
     * 创建注册id
     */
    async createRegistrationId(name: string) {
        // 生成一个注册id
        const registrationId = KeyHelper.generateRegistrationId();
      
    
        // TODO：把生成的 id 存储到本地
        // @ts-ignore
        // DB!.users.put({ user_id: 'test1', user_registrationId: registrationId })
        // .then(() => {
        //   console.log('联系人插入成功！')
        // })
        // .catch((error: { message: string; }) => {
        //   console.error('联系人插入失败:', error?.message)
        // })
        // this.db.keypairs.where("a").above(100).modify({ field1: "value1" });
        // storeSomewhereSafe(store)(`registrationID`, registrationId);
    
        // 生成身份密钥对
        const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    
        // TODO：把生成的身份密钥对存储到本地
        // storeSomewhereSafe(store)("identityKey", identityKeyPair);
    
        // 生成一个预共享密钥
        const baseKeyId = Math.floor(10000 * Math.random());
    
        // 存储预密钥
        const preKey = await KeyHelper.generatePreKey(baseKeyId);
    
        // 存储预密钥
        // store.storePreKey(`${baseKeyId}`, preKey.keyPair);
    
        // 随机生成一个签名密钥 id
        const signedPreKeyId = Math.floor(10000 * Math.random());
    
        // 生成签名密钥
        const signedPreKey = await KeyHelper.generateSignedPreKey(
          identityKeyPair,
          signedPreKeyId
        );
    
        // 存储签名密钥
        // store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
    
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

}