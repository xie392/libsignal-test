# libsignal-test

基于 `libsignal-protocol-typescript` 的 `Demo`, [参考例子](https://codesandbox.io/p/sandbox/adoring-brown-w1uti)

# 基本加密解密流程：

1. **创建身份密钥对（Identity Key Pair）**：

-   用户在注册时生成一个身份密钥对，包括私钥和公钥。私钥用于签名身份信息，而公钥用于其他用户验证身份。

2. **创建预共享密钥对（Prekey Pair）**：

-   用户创建一组预共享密钥对，用于将密钥交给其他用户。这些密钥在用户离线时，被发送给 Signal 服务器并在需要时被其他用户获取。

3. **生成会话密钥（Session Key）**：

-   当用户要与另一个用户进行加密通信时，他们会生成一个临时的会话密钥。这个会话密钥是对称密钥，用于加密和解密实际的消息。

4. **密钥协商（Key Agreement）**：

-   使用 Diffie-Hellman 协议，通信的两个用户交换公钥，然后通过对方的公钥和自己的私钥计算出共享的会话密钥。

5. **发送预共享密钥（Sending Prekeys）**：

-   用户的预共享密钥会被上传到 Signal 服务器，以便其他用户可以获取。这样，当其他用户想要与该用户建立通信时，他们可以获取这些密钥。

6. **初始化会话（Initialize Session）**：

-   当用户 A 要与用户 B 通信时，首先通过 Signal 服务器获取用户 B 的身份公钥和预共享密钥。

7. **建立安全通道（Establish Secure Channel）**：

-   使用身份公钥、预共享密钥和 Diffie-Hellman 协议派生的共享密钥，用户 A 和用户 B 建立起一个安全的通信通道。

8. **加密和解密消息**：

-   使用共享的会话密钥，用户 A 可以加密消息以发送给用户 B，用户 B 使用相同的密钥解密消息。
