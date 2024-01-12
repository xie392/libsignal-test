import Dexie from 'dexie'

// COSSIM 客户端数据库
const WebDB = new Dexie('COSSIM_TEST')

/**
 * 数据库版本号
 * Dexie.semVer	Dexie.version
 * "1.0.0"      1.0
 * "1.0.1"      1.0001
 * "1.1.0"      1.01
 * "1.3.4"      1.0304
 */
const WEBDB_VERSION = 1.0 // 对表结构进行修改时需要进版本号修改

WebDB.version(WEBDB_VERSION).stores({
	// 消息列表
	messages: `
		++id,
		sender_id, 
		receiver_id, 
		content, 
		content_type, 
		type, 
		date, 
		send_state, 
		is_read,
	`,
	keypairs:`
		++id,
		sender_id,
		sender_name,
		sender_device_id,
		signed_pre_key,
		sender_identity_key,
		sender_pre_key_id,
		sender_public_key,
		sender_registration_id,
		sender_signed_pre_key,
		sender_signature
	`
})

export default WebDB
