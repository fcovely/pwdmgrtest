import {Toast} from 'native-base';
import { EventRegister } from 'react-native-event-listeners'

import {EthernomAPI} from "@ethernom/ethernom-api";
import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
import {VERSION_MGR} from "@ethernom/ethernom_version_mgr";
var PSD_MGR_API = new PSD_MGR();

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

const company = "Ethernom, Inc.",
	  name = "Password Manager",
	  bundle = "com.ethernom.password.manager.mobile",
	  version = "1.2.9",
	  group = "group.com.ethernom.password.manager.mobile";

module.exports = class E_API_Manager {
	
	VERSION_MGR_API = new VERSION_MGR(PSD_MGR_API.APP_ID, company, name, bundle, version, group);
	
	constructor() {
        this.CURR_E_API = null;
    }
	
	request_reconnect = (deviceID, deviceName, deviceSN, callback) => {
		setTimeout(function () {
			global.state.setState({ spinner: {visible: true, text: "Loading: Reconnecting device..."} })
		}, 600);
		
		if(this.CURR_E_API != null) this.CURR_E_API = null;
		
		if(this.request_reconnect_callback != null) this.request_reconnect_callback = null;
		this.request_reconnect_callback = callback;
		
		this._init_e_api_device(deviceID, deviceName, deviceSN);
	}
	
	_init_e_api_device = async (deviceID, deviceName, deviceSN) => {
		var E_API = await new EthernomAPI("BLE", PSD_MGR_API.SERIVCE_PORT, 0, false, true, async (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
            	this.CURR_E_API = await E_API;
                this._device_select(deviceID, deviceName, deviceSN);
            }
        });
	}
	
	_device_select = (deviceID, deviceName, deviceSN) => {  
        var parent = this;
		this.connection_timeout = setTimeout(function () {
			console.log("Taking too long...");
			
			parent.connection_timeout_occur = true;
			parent.CURR_E_API.CardClose(callback = (resultCode) => {
				parent.CURR_E_API = null;
			});
			
			console.log(parent);
			global.state.setState({ 
				spinner: {visible: false, text: ""},
				alert: true
			});
		}, 5000);
        
        console.log('DEVICE_SELECTING: ', deviceID, deviceName, deviceSN);
        this.CURR_E_API.Select(deviceID, deviceSN, deviceName, async (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
            	clearTimeout(this.connection_timeout);
                this.connection_timeout_occur = false;
            
            	global.E_API = await this.CURR_E_API;
            	this.CURR_E_API = null;
            	
				this._request_app_auth();
            }
        });
    };
    
    _request_app_auth = () => {
    	this.VERSION_MGR_API.request_app_auth(global.E_API, callback = async (E_API, authenticated) => {
    		global.E_API = await E_API;
    		if(authenticated === true){
    			this._request_launch_card_app();
			}
		});
    }
    
    _request_launch_card_app = () => {
    	console.log("Launching app...");
    	global.E_API.LaunchApp(PSD_MGR_API.APP_ID, (resultCode) => {
    		if(resultCode === ETH_SUCCESS) {
				this._start_app_protocol();
			}else if(resultCode === 1){
				this._request_app_auth();
			}else{
				console.log("Launch fails...");
			}
		})
    }
    
    _start_app_protocol = async () => {
    	var d_id = global.E_API.currID, d_name = global.E_API.currName, d_sn = global.E_API.currSN;
    	global.E_API.OnCardDisconnected((resultCode) => {
            if (resultCode === ETH_SUCCESS) {
            	console.log("On card disconnected...");
            	
            	global.state.setState({ 
					spinner: {visible: false, text: ""},
					curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false},
					bottom_sheets_height: 160
				});
            	EventRegister.emit('DEVICE_STATUS', false);
				global.E_API = null;
            };
    	});
    
    	var session = await Storage.get_session_pin(global.E_API.currID);
        this.len = await Storage.get_pin_len();
        if(this.len){
			if(session == null || session == false){
				this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, null, this.len, this._session_callback);
			}else{
				this.curr_PIN = session;
				this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, session, this.len, this._session_callback);
			}
        }
    }
    
    _session_callback = (new_PIN) => {
    	if(new_PIN == false){
    		Storage.update_session_time();
    		this._init_password_manager();
    	}else{
    		console.log("Require PIN...");
    		global.navigate('PIN_Entry_Screen', {new_pin: new_PIN, pin_len: this.len, from: "RECONNECT"});
    	}
    }
    
    _init_password_manager = () => {
		var code = makeCode(6);
		var out_msg = PSD_MGR_API.outMsg_request_OpenService(global.device_name, code, global.device_id.substring(0, 20));
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		
		global.E_API.WriteJSON_Encrypted(out_msg, in_msg, false, (resultCode, msg) => {
			if (resultCode === ETH_SUCCESS) {
				var msg_obj = JSON.parse(msg);
				this._process_reply_command(msg_obj);
			}
		});
	}
    
    _start_key_exchange = () => {
		if (global.E_API !== null) {
			global.E_API.DoAppKeyExchange(this.curr_PIN, resultCode => {
				if (resultCode === ETH_SUCCESS) {
					console.log('pin entry key exchange success');
					
					global.state.setState({ 
						spinner: {visible: false, text: ""},
						curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true} 
					})
					EventRegister.emit('DEVICE_STATUS', true);
					this.request_reconnect_callback(true);
				}
			});
		
		} else {
			console.log("E_API, doesn't exist");
		}
	}
	
	/*
	============================================================================================================
	======================================= WRITING/READING ====================================================
	============================================================================================================
	*/
    _write_card = (out_msg, in_msg) => {
		if (global.E_API !== null){
			global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
                if (resultCode === ETH_SUCCESS) {
                    var msg_obj = JSON.parse(msg);
                    this._process_reply_command(msg_obj);
                }
            });
        }else{
        	console.log("E_API, doesn't exist")
        }
    };
    
    _process_reply_command = async (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_INIT:
				if (msg.response === PSD_MGR_API.AWK) {
					this._start_key_exchange();
					
				}else{
					console.log("TEST");
				
				}
				break;

			default:
				break;
		};
    };
}


function makeCode(length) {
    var result = '';
    var characters = 'abcdef0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}