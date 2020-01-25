//PSD MGR PSUEDO CODE:
import React, {Component} from 'react';
import {AppState, Platform, PermissionsAndroid, Alert, View, StyleSheet, Dimensions} from 'react-native';
import Dialog from "react-native-dialog";
var deviceWidth = Dimensions.get("window").width;
import DeviceInfo from 'react-native-device-info';

//import RNPermissions, {check, request, PERMISSIONS, RESULTS} from "react-native-permissions";

import {EventRegister} from "react-native-event-listeners";

//Storage API
const StorageAPI = require('./Storage.js');
const Storage = new StorageAPI();

import {EthernomAPI} from "@ethernom/ethernom-api";
import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
import {VERSION_MGR} from "@ethernom/ethernom_version_mgr";
var PSD_MGR_API = new PSD_MGR();
const VERSION_MGR_API = new VERSION_MGR();

export default class ETH_API_Manager extends Component {
    VERSION_MGR_API = new VERSION_MGR(PSD_MGR_API.APP_ID, "Ethernom, Inc.", "Password Manager", "com.ethernom.password.manager.mobile", "1.2.9", "group.com.ethernom.password.manager.mobile");
    constructor(props) {
        super(props);

        this.state = {
            appState: AppState.currentState,
            alert: {force: false, update: false, battery: false}
        };
        
        this.item_list 	 = [];
        this.add_item 	 = null;
        this.edit_item 	 = null;
        this.delete_item = null;
        this.tmp_item    = null;
    }

    async componentDidMount(): void {
        this.listener = EventRegister.addEventListener('BLE_EVENT', async (data) => {
            var rcv_msg = JSON.parse(data);

            switch (rcv_msg.title) {
                case "REQUEST_CONNECT_DEVICE":
                    await this._request_card_connect(rcv_msg.peripheral.id, rcv_msg.peripheral.name, rcv_msg.peripheral.sn);
                    break;
				
				/*
                case "REQUEST_SWITCH_DEVICE":
                    await this._request_switch_card_connect(rcv_msg.peripheral.id, rcv_msg.peripheral.name, rcv_msg.peripheral.sn);
                    break;

                case "REQUEST_DISCONNECT_CUR_SWITCH_DEVICE":
                    this.close_switch_device();
                    global.card_name = global.connectedDevice.name;
                    global.card_id = global.connectedDevice.id;
                    global.peripheral = {id: global.connectedDevice.id, name: global.connectedDevice.name, connected: true};
                    this.peripheral = {id: global.connectedDevice.id, name: global.connectedDevice.name, auto: true, connected: true};
                    break;
                
                case "REPLY_BLE_CUR_DISCONNECTED_PERIPHERAL":
                    this.close_switch_device();
                    global.peripheral = {id: "", name: "", connected: false};
                    this.peripheral = {id: null, name: null, auto: true, connected: false};
                    break;
                */

                case "REQUEST_DISCONNECT_DEVICE":
                    this._request_suspend_app();
                    /*
                    this._request_suspend_app();
                    this.request_disconnect();
                    global.peripheral = {id: "", name: "", sn: "", connected: false};
                    this.peripheral = {id: null, name: null, auto: true, connected: false};
                    */
                    break;

                case "REQUEST_GENERATE_PACKET":
                    this._process_request_generate(rcv_msg.payload);
                    break;

                case "REQUEST_ACCOUNT_PASSWORD":
                    this._request_get_account_password(rcv_msg.payload);
                    break;

                default:
                    break;
            }
        });

        AppState.addEventListener('change', this._handleAppStateChange);
        await this._init_app();
    }

    componentWillUnmount() {
        AppState.removeEventListener('change', this._handleAppStateChange);
        EventRegister.removeEventListener(this.listener);
    }

    _handleAppStateChange = (nextAppState) => {
        if (nextAppState === 'background') {
        	this._request_cancel_usage();
        	this.setState({ alert: {force: false, update: true, battery: false} })
        	
            //console.log(global.peripheral);
            //this._request_cancel_usage(global.peripheral.id, global.peripheral.name, CURR_E_API, false);

            //this._request_suspend_app();
            //global.peripheral = {id: "", name: "", connected: false};
            //this.peripheral = {id: null, name: null, auto: true, connected: false};
            
            //this.setState({ alert: {force: false, update: false, battery: false} });
			
			/*
            if(global.switchDeviceStatus){
                this.request_disconnect();
                this.close_switch_device();
                this.E_API_List = [];
            }
            */
        }
        this.setState({appState: nextAppState});
    };

    _init_app = async () => {
        global.device_name = await DeviceInfo.getDeviceName().then(deviceName => {
            if(deviceName.includes("’")) deviceName = deviceName.replace("’", "'");
            if(deviceName.length === 1) return deviceName + " ";
            return deviceName
        });

        global.device_id = await DeviceInfo.getDeviceId().then(deviceId => {
            return deviceId
        });
    };
	
    _request_get_account_password = (payload) => {
        var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(payload.url, payload.name);
        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
        this._write_card(out_msg, in_msg);
    };
    
	/*
    _callback = (E_API) => {
        console.log("Disconnect Success");
        if (E_API != null) {
            E_API.UnSubscribeToUnsolictedEvents();
            E_API.DisconnectListeners();
            E_API.StopDiscovery();
          //  E_API = null;
        }
    };
    */

    /*
    ============================================================================================================
    ========================================CONNECTING DEVICE===================================================
    ============================================================================================================
    */
    _request_card_connect = async (deviceID, deviceName, deviceSN) => {
    	//this.peripheral = {id: deviceID, name: deviceName, sn: deviceSN, auto: true, connected: false};
        await this._request_device_connect(deviceID, deviceName, deviceSN);
    };

    _request_device_connect = async (deviceID, deviceName, deviceSN) => {
        console.log('DEVICE_CONNECTING: ', deviceID, deviceName, deviceSN);
        var E_API = await new EthernomAPI("BLE", PSD_MGR_API.SERIVCE_PORT, 0, false, true, (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
                this._device_select(E_API, deviceID, deviceName, deviceSN);
                //this.call_card_close();
            }
        });
        
        /*
        if (CURR_E_API != null) {
            this._request_suspend_app();
            CURR_E_API.DisconnectListeners();
            CURR_E_API = null;
        }
        */
    };

	/*
    call_card_close = () => {
        let parent = this;
        this.connection_card_close = setTimeout( function () {
            if(global.isAppLaunch === false){
                CURR_E_API.CardClose(parent._callback(CURR_E_API));
                global.peripheral.connected = false;

                let msgD = {title: "REPLY_BLE_DISCONNECTED_PERIPHERAL"};
                EventRegister.emit('VAULT_EVENT', JSON.stringify(msgD));
                EventRegister.emit('DEVICE_EVENT', JSON.stringify(msgD));
                EventRegister.emit('SETTING_EVENT', JSON.stringify(msgD));
            }

        }, 5000);

    };
    */

    _device_select = async (E_API, deviceID, deviceName, deviceSN) => {  
        var parent = this;
		this.connection_timeout = setTimeout(function () {
			E_API.CardClose(callback = (resultCode) => {
				E_API.UnSubscribeToUnsolictedEvents();
				E_API.DisconnectListeners();
				E_API = null;
			});
			
			parent._request_device_connect(deviceID, deviceName, deviceSN);
		}, 5000);
        
        E_API.Select(deviceID, deviceSN, deviceName, (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
                clearTimeout(this.connection_timeout);
				global.E_API = E_API;
				
				this._request_app_auth();
				
                //var connect_data = {code: "123456", deviceName: deviceName, deviceID: deviceID};
                //var msgs = {title: "REPLY_BLE_CONNECTING_PERIPHERAL", data: connect_data};
                //EventRegister.emit('VAULT_EVENT', JSON.stringify(msgs));
                
                //clearTimeout(this.connection_card_close);
                //global.isAppLaunch = true;
            }
        });
    };
    
     /*
   ============================================================================================================
   ================================ CHECKING AUTH/VERSION/BATTERY =============================================
   ============================================================================================================
   */
    _request_app_auth = () => {
    	console.log("Checking authentication...");
    	this.VERSION_MGR_API.request_app_auth(global.E_API, callback = (E_API, authenticated) => {
    		global.E_API = E_API;
    		
    		if(authenticated === true){
				this._request_check_version();
			}else{
				this._request_cancel_usage();
				this.setState({ alert: {force: true, update: false, battery: false} })
			}
		});
    }
    
    _request_check_version = () => {
    	console.log("Checking version...");
    	this.VERSION_MGR_API.request_check_version(global.E_API, callback = (E_API, updates) => {
    		global.E_API = E_API;
			
			//updates = true;
			if(updates === true){
				let parent = this;
				setTimeout(function () {
					parent.setState({ alert: {force: false, update: true, battery: false} })
				}, 300);
				
			}else{
				this._request_check_battery_level();
			}
		});
    }

    _request_check_battery_level = () => {
    	console.log("Checking battery...");
		this.VERSION_MGR_API.request_check_battery(global.E_API, callback = (E_API, battery_low) => {
    		global.E_API = E_API;
    		
    		//battery_low = true;
			if(battery_low == true){
				let parent = this;
				setTimeout(function () {
					parent.setState({ alert: {force: false, update: false, battery: true} })
				}, 300);

			}else{
				this._request_launch_card_app();
			}
		});
    }
	
	handle_request_launch_dm_app = () => {
        this.setState({ alert: {force: false, update: false, battery: false} });
        this.VERSION_MGR_API.request_launch_dm(global.E_API.currID);
		this._request_cancel_usage();
    };

    handle_check_battery_level = () => {
        this.setState({ alert: {force: false, update: false, battery: false} });
        this._request_check_battery_level()
    };

    handle_cancel_request = () => {
        this.setState({ alert: {force: false, update: false, battery: false} });
        this._request_cancel_usage();
    };

    handle_launch_card_app = () => {
        this.setState({ alert: {force: false, update: false, battery: false} });
        this._request_launch_card_app();
    };

	 /*
   ============================================================================================================
   ==================================== LAUNCH/CANCEL PROTOCOL ================================================
   ============================================================================================================
   */
    _request_launch_card_app = (deviceID, deviceName, CUR_API, isSwitchDevice) => {
        global.E_API.LaunchApp(PSD_MGR_API.APP_ID, async (resultCode) => {
			if (resultCode === ETH_SUCCESS) {
				await this._start_app_protocol();
			}
		})
	};
	
	_request_cancel_usage = () => {
		if(global.E_API != null){
			global.E_API.CardClose(async (resultCode) => {
				if (resultCode === ETH_SUCCESS) {
					global.E_API = null;
				
					if(Platform.OS !== "android"){
						let msgD = {title: "REPLY_BLE_DISCONNECTED_PERIPHERAL"};
						EventRegister.emit('VAULT_EVENT', JSON.stringify(msgD));
						EventRegister.emit('DEVICE_EVENT', JSON.stringify(msgD));
						EventRegister.emit('SETTING_EVENT', JSON.stringify(msgD));
					}
				}
			})
		}
	};
	
    _request_suspend_app = () => {
    	if(global.E_API != null){
    		global.E_API.DisconnectApp((resultCode) => {
    			 if(resultCode === ETH_SUCCESS){
    			 	global.E_API.UnSubscribeToUnsolictedEvents();
                    global.E_API.DisconnectListeners();
                    global.E_API = null;
                    
                    if(Platform.OS !== "android"){
                        let msgD = {title: "REPLY_BLE_DISCONNECTED_PERIPHERAL"};
                        EventRegister.emit('VAULT_EVENT', JSON.stringify(msgD));
                        EventRegister.emit('DEVICE_EVENT', JSON.stringify(msgD));
                        EventRegister.emit('SETTING_EVENT', JSON.stringify(msgD));
                    }
    			 }
    		});
    	}
    };

    _start_app_protocol = async () => {
        global.E_API.OnCardDisconnected((resultCode) => {
            if (resultCode === ETH_SUCCESS) {
            	console.log("On card disconnected...");
            	global.E_API = null;
            };
        });

        var code = makeCode(6);
        var out_msg = PSD_MGR_API.outMsg_request_OpenService(global.device_name, code, global.device_id.substring(0, 20));
        var in_msg = PSD_MGR_API.inMsg_reply_generic();
        this._write_card(out_msg, in_msg);
    };

    /*
   ============================================================================================================
   ========================================SWITCH DEVICE===================================================
   ============================================================================================================
   */
   /*
    _request_switch_card_connect = async (deviceID, deviceName, deviceSN) => {
        console.log('SWITCHING DEVICE_CONNECTING: ', deviceID, deviceName, deviceSN);
        SWITCH_E_API = await new EthernomAPI("BLE", PSD_MGR_API.SERIVCE_PORT, 0, false, true, (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
                if (resultCode === ETH_SUCCESS) {
                    var parent = this;
                    this.connection_timeout = setTimeout(function(){
                        parent._device_switch_device_select(deviceID, deviceName, deviceSN);
                    }, 5000);

                    this._device_switch_device_select(deviceID, deviceName, deviceSN);

                   this.call_card_close_on_switch_device();
                }
            }
        });

    };
    
    call_card_close_on_switch_device = () => {
        let parent = this;
        this.connection_card_close = setTimeout(async function () {
            if(global.isOnSwitchAppLauch === false){
                SWITCH_E_API.CardClose(parent._callback(SWITCH_E_API));
                await parent.handle_card_close_event();
            }
        }, 5000);
    };
    
    handle_card_close_event = () => {
        var msg_obj = {title: "REQUEST_DISCONNECT_CUR_SWITCH_DEVICE", from: "BLE"};
        EventRegister.emit('DEVICE_EVENT', JSON.stringify(msg_obj));

        let msgD = {title: "REPLY_BLE_DISCONNECTED_SWITCH_PERIPHERAL"};
        EventRegister.emit('VAULT_EVENT', JSON.stringify(msgD));

        global.switchDeviceStatus = false;

        global.card_name = global.connectedDevice.name;
        global.card_id = global.connectedDevice.id;

        global.peripheral = {id: global.connectedDevice.id, name: global.connectedDevice.name, connected: true};
        this.peripheral = {
            id: global.connectedDevice.id,
            name: global.connectedDevice.name,
            auto: true,
            connected: true
        };

    };

    _device_switch_device_select = (deviceID, deviceName, deviceSN) => {
        SWITCH_E_API.Select(deviceID, deviceSN, deviceName, (resultCode) => {
            if (resultCode === ETH_SUCCESS) {

                clearTimeout(this.connection_timeout);
                clearTimeout(this.connection_card_close);
                global.isOnSwitchAppLauch = true;

                var connect_data = {code: "123456", deviceName: deviceName, deviceID: deviceID};
                var msgs = {title: "REPLY_BLE_CONNECTING_PERIPHERAL", data: connect_data};
                EventRegister.emit('VAULT_EVENT', JSON.stringify(msgs));

                if (SWITCH_E_API != null) {
                	this._request_app_auth(deviceID, deviceName, SWITCH_E_API, true);
                }
            }
        });
    };

    _start_app_protocol_switch_device = async (deviceID, deviceName) => {
        SWITCH_E_API.OnCardDisconnected((resultCode) => {
            if (resultCode === ETH_SUCCESS) {
				this.E_API_List = [];
                if(global.switchDeviceStatus === false){
                    this.peripheral = {id: null, name: null, auto: true, connected: false};
                    global.peripheral = {id: "", name: "", connected: false};
                                        
                    let msgD = {title: "REPLY_BLE_DISCONNECTED_PERIPHERAL"};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msgD));
                    EventRegister.emit('DEVICE_EVENT', JSON.stringify(msgD));
                    EventRegister.emit('SETTING_EVENT', JSON.stringify(msgD));
                }else {
                    let msgD = {title: "REPLY_BLE_DISCONNECTED_SWITCH_PERIPHERAL"};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msgD));
                    EventRegister.emit('DEVICE_EVENT', JSON.stringify(msgD));

                    global.card_name = global.connectedDevice.name;
                    global.card_id = global.connectedDevice.id;

                    global.peripheral = {id: global.connectedDevice.id, name: global.connectedDevice.name, connected: true};
                    this.peripheral = {id: global.connectedDevice.id, name: global.connectedDevice.name, auto: true, connected: true};
                }
            }
        });

        this.peripheral = {id: deviceID, name: deviceName, auto: true, connected: true};

        var code = makeCode(6);
        var out_msg = PSD_MGR_API.outMsg_request_OpenService(global.device_name, code, deviceID.substring(0, 20));
        var in_msg = PSD_MGR_API.inMsg_reply_generic();
        
        console.log(SWITCH_E_API);
        this._write_card(out_msg, in_msg, SWITCH_E_API);
    };

    _request_card_close = (deviceID) => {
        if(this.E_API_List.length > 0) {
            console.log(this.E_API_List);
            for (let i = 0; i < this.E_API_List.length; i++) {

                if(this.E_API_List[i].deviceID === deviceID){
                    if (this.E_API_List[i].INSTANCE != null) {

                        this.E_API_List[i].INSTANCE.DisconnectApp((resultCode) => {
                            if(resultCode === ETH_SUCCESS){
                                this.E_API_List[i].INSTANCE.UnSubscribeToUnsolictedEvents();
                                this.E_API_List[i].INSTANCE.DisconnectListeners();
                                this.E_API_List[i].INSTANCE = null;

                                if (this.E_API_List.length > 1) {
                                    this.E_API_List.splice(i, 1);
                                } else {
                                    this.E_API_List = [];
                                }


                            }else{
                                console.log("Suspend error");
                            }
                        });

                    }
                }
            }
        }

    };

    request_disconnect = () => {
        if(this.E_API_List.length > 0) {
            console.log(this.E_API_List);
            for (let i = 0; i < this.E_API_List.length; i++) {
                if (this.E_API_List[i].INSTANCE != null) {

                    this.E_API_List[i].INSTANCE.DisconnectApp((resultCode) => {
                        if(resultCode === ETH_SUCCESS){
                            this.E_API_List[i].INSTANCE.UnSubscribeToUnsolictedEvents();
                            this.E_API_List[i].INSTANCE.DisconnectListeners();
                            this.E_API_List[i].INSTANCE = null;

                            if (this.E_API_List.length > 1) {
                                this.E_API_List.splice(i, 1);
                            } else {
                                this.E_API_List = [];
                            }


                        }else{
                            console.log("Suspend error");
                        }
                    });

                }


            }
        }
    };

    close_switch_device = () => {
        if(SWITCH_E_API != null){
            SWITCH_E_API.DisconnectApp((resultCode) => {
                if(resultCode === ETH_SUCCESS){
                    SWITCH_E_API.UnSubscribeToUnsolictedEvents();
                    SWITCH_E_API.DisconnectListeners();
                    SWITCH_E_API = null;

                }else{
                    console.log("Suspend error");
                }
            })
        }

    };
	*/
    /*
   ============================================================================================================
   ============================================================================================================
   ============================================================================================================
   */
    _write_card = (out_msg, in_msg) => {
    	if (global.E_API !== null){
            global.E_API.WriteJSON(out_msg, in_msg, (resultCode, msg) => {
                if (resultCode === ETH_SUCCESS) {
                    var msg_obj = JSON.parse(msg);
                    console.log(msg_obj);
                    this._process_reply_command(msg_obj, false);
                }
            });
        }
    };
    
    _process_request_generate = (payload) => {
    	console.log(payload);
        switch (payload.cmd) {
            case "CHECK_ACCOUNT":
                console.log("CHECK ACCOUNT");
                this.tmp_item = {key: payload.data.name, url: payload.data.url, username: payload.data.username, password: payload.data.password};
                var out_msg = PSD_MGR_API.outMsg_request_checkAccount(payload.data.url, payload.data.username, payload.data.password);
                var in_msg = PSD_MGR_API.inMsg_reply_generic();
                this._write_card(out_msg, in_msg);
                break;

            case "ADD_ACCOUNT":
                this.add_item = [{key: payload.data.name, url: payload.data.url, username: payload.data.username, password: payload.data.password}];
                var out_msg = PSD_MGR_API.outMsg_request_addAccount(payload.data.url, payload.data.username, payload.data.password, payload.data.name);
                var in_msg = PSD_MGR_API.inMsg_reply_generic();
                this._write_card(out_msg, in_msg);
                break;

            case "EDIT_ACCOUNT":
                var i = payload.data.index;
                this.edit_item = {index: i, data: {key: payload.data.name, url: payload.data.url, username: payload.data.username, password: payload.data.password}};
                if (this.item_list[i].url === payload.data.url && this.item_list[i].username === payload.data.username) {
                    var out_msg = PSD_MGR_API.outMsg_request_editAccount(payload.data.url, payload.data.username, payload.data.password, payload.data.name);
                    var in_msg = PSD_MGR_API.inMsg_reply_generic();
                    this._write_card(out_msg, in_msg);
                
                } else {
                    var out_msg = PSD_MGR_API.outMsg_request_deleteAccount(this.item_list[i].url, this.item_list[i].username);
                    var in_msg = PSD_MGR_API.inMsg_reply_generic();
                    this._write_card(out_msg, in_msg);
                }
                break;

            case "DELETE_ACCOUNT":
                var i = payload.data.index;
                this.delete_item = {index: i, data: {key: payload.data.name, url: payload.data.url, username: payload.data.username, password: payload.data.password}};
                var out_msg = PSD_MGR_API.outMsg_request_deleteAccount(payload.data.url, payload.data.username);
                var in_msg = PSD_MGR_API.inMsg_reply_generic();
                this._write_card(out_msg, in_msg);
                break;
                
            case "REPLY_PIN_ENTRY":
                var out_msg = PSD_MGR_API.get_outMsg_PINEntry(payload.data.pinCode);
                var in_msg = PSD_MGR_API.inMsg_reply_OpenService();
                this._write_card(out_msg, in_msg);
                break;

            default:
                break;
        }
    };


    _process_reply_command = (msg_obj, reply_code) => {
        switch (msg_obj.command) {
            case PSD_MGR_API.C2H_RQST_PIN_ENTRY:
                if (reply_code){
                    console.log("WRONG PIN");
                    var msg = {title: "PIN_NOT_MATCH"};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                }
                var msg = {title: "CARD_REQUEST_ENTRY_PIN"};
                EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));

                break;

            case PSD_MGR_API.C2H_RPLY_INIT:
                if (msg_obj.response === PSD_MGR_API.AWK) {
                    console.log("card approve connection...");

                    this.item_list = [];
                    /*
                    if(global.switchDeviceStatus === true){
                        this._request_card_close(global.connectedDevice.id);
                        CURR_E_API = SWITCH_E_API;
                        SWITCH_E_API = null;
                        global.switchDeviceStatus = false;

                    }

                    global.isOnSwitchAppLauch = false;
                    global.isAppLaunch = false;
                    
                    // add to list
                    if(CURR_E_API != null) {
                        let E_API_INSTANCE = { INSTANCE: CURR_E_API, deviceID: this.peripheral.id, deviceName: this.peripheral.name};
                        this.E_API_List.push(E_API_INSTANCE);
                    }
                    */

                    var index = 0;
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount();
                    this._write_card(out_msg, in_msg);
					
					
                    //global.peripheral = {id: this.peripheral.id, name: this.peripheral.name, connected: true};
                    Storage.register_peripheral_data(global.E_API.currID, global.E_API.currName);
                    var msg = {title: "REPLY_BLE_CONNECTED_PERIPHERAL", device: global.E_API.currID, device_name: global.E_API.currName};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                    
                    //global.connectedDevice = {id:  this.peripheral.id, name: this.peripheral.name}

                }else if (msg_obj.response === PSD_MGR_API.NAK){
	
                }
                break;

            case PSD_MGR_API.C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY:
                if (msg_obj.response === PSD_MGR_API.AWK) {
                    var obj = [{key: msg_obj.name, url: msg_obj.url, username: msg_obj.username, password: msg_obj.password}];
                    this.item_list = this.item_list.concat(obj);

                    var index = msg_obj.index;
                    var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
                    var in_msg = PSD_MGR_API.inMsg_reply_getAccount();
                    this._write_card(out_msg, in_msg);

                } else if (msg_obj.response === PSD_MGR_API.OTHER) {
                	console.log("Retrieving data done...");
                    var msg = {title: "REPLY_ITEM_LIST", list: this.item_list};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                }
                break;

            case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
                console.log("C2H_RPLY_GET_ACCOUNT_PASS");
                if (msg_obj.response === PSD_MGR_API.AWK) {
                    var msg = {title: "REPLY_ACCOUNT_PASSWORD", data: msg_obj.password};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                }
                break;

            case PSD_MGR_API.C2H_RPLY_CHECK_ACCOUNT:
                if (msg_obj.response === PSD_MGR_API.NAK) {
                    console.log("C2H_RPLY_CHECK_ACCOUNT: No Duplicates found");
                    this.add_item = [{key: this.tmp_item.key, url: this.tmp_item.url, username: this.tmp_item.username, password: this.tmp_item.password}];
                    var out_msg = PSD_MGR_API.outMsg_request_addAccount(this.tmp_item.url, this.tmp_item.username, this.tmp_item.password, this.tmp_item.key);
                    var in_msg = PSD_MGR_API.inMsg_reply_generic();
                    this._write_card(out_msg, in_msg);
                    
                } else if (msg_obj.response === PSD_MGR_API.AWK) {
                    console.log("C2H_RPLY_CHECK_ACCOUNT: exist , Duplicates but different in password");
                    var msg = {title: "REPLY_DUPLICATE", data: {type: "DUPLICATE_DIFFERENT_PASSWORD"}};
                    EventRegister.emit('ADD_ACCOUNT_EVENT', JSON.stringify(msg));

                } else if (msg_obj.response === PSD_MGR_API.OTHER) {
                    console.log("C2H_RPLY_CHECK_ACCOUNT: Duplicates exact");
                    var msg = {title: "REPLY_DUPLICATE", data: {type: "DUPLICATE_ACCOUNT"}};
                    EventRegister.emit('ADD_ACCOUNT_EVENT', JSON.stringify(msg));
                }
                break;

            case PSD_MGR_API.C2H_RPLY_ADD_ACCOUNT:
                if (msg_obj.response === PSD_MGR_API.AWK) {
                    console.log("add successfull");
                    this.item_list = this.item_list.concat(this.add_item);
                    var msg = {title: "REPLY_ITEM_LIST", list: this.item_list};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                    EventRegister.emit('ADD_ACCOUNT_EVENT', JSON.stringify(msg));
                    this.add_item = null;
                    this.tmp_item = null;
                    
                } else {
                    var msg = {title: "REPLY_ADD_ACCOUNT_FAIL", list: this.item_list};
                    EventRegister.emit('ADD_ACCOUNT_EVENT', JSON.stringify(msg));
                    this.add_item = null;
                    this.tmp_item = null;
                    console.log("can't add successfull");
                }
                break;

            case PSD_MGR_API.C2H_RPLY_EDIT_ACCOUNT:
                if (msg_obj.response === PSD_MGR_API.AWK) {
                    console.log("edit successfull");
                }

            case PSD_MGR_API.C2H_RPLY_OVERWRITE_ACCOUNT:
                if (msg_obj.response === PSD_MGR_API.AWK) {
                    console.log("overwrite successfull");
                    this.item_list[this.edit_item.index] = this.edit_item.data;
                    var msg = {title: "REPLY_ITEM_LIST", list: this.item_list};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                    this.edit_item = null;
                }
                break;

            case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT:
                console.log("delete successfull");
                if (this.edit_item != null) {
                    var out_msg = PSD_MGR_API.outMsg_request_editAccount(this.edit_item.data.url, this.edit_item.data.username, this.edit_item.data.password, this.edit_item.data.key);
                    var in_msg = PSD_MGR_API.inMsg_reply_generic();
                    this._write_card(out_msg, in_msg);

                } else {
                    for (let items of this.item_list) {
                        if (items.key === this.delete_item.data.key) {
                            const filteredData = this.item_list.filter(item => item.key !== items.key);
                            this.item_list = filteredData;
                            console.log(this.item_list)
                        }
                    }

                    var msg = {title: "REPLY_ITEM_LIST", list: this.item_list}
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
                    this.delete_item = null;
                }
                break;
                
            default:
            	break;
        }
    };

	render() {
		return (
			<View>
				<Dialog.Container visible={this.state.alert.force}>
					<Dialog.Title>Updates required!</Dialog.Title>
					<Dialog.Description>
						You must update your device! please use Ethernom Device Manager Application.
					</Dialog.Description>
					<Dialog.Button label="Update device" onPress={this.handle_request_launch_dm_app} />
				</Dialog.Container>
			
				<Dialog.Container visible={this.state.alert.update}>
					<Dialog.Title>Updates required!</Dialog.Title>
					<Dialog.Description>
						To update your device, please use Ethernom Device Manager Application.
					</Dialog.Description>
					<Dialog.Button label="Dismiss" onPress={this.handle_cancel_request} />
					<Dialog.Button label="Ignore update" onPress={this.handle_check_battery_level} />
					<Dialog.Button label="Update device" onPress={this.handle_request_launch_dm_app} />
				</Dialog.Container>

				<Dialog.Container visible={this.state.alert.battery}>
					<Dialog.Title> Battery low!</Dialog.Title>
					<Dialog.Description>
						Please charge your device using the USB accessory.
					</Dialog.Description>
					<Dialog.Button label="Dismiss" onPress={this.handle_cancel_request} />
					<Dialog.Button label="Ignore warning" onPress={this.handle_launch_card_app} />
				</Dialog.Container>
			</View>
		);
	}
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

/*
this._request_check_permission();
_request_check_permission = () => {
	if(Platform.OS === 'android'){
		check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then(result => {
			switch (result) {
				case RESULTS.DENIED:
					console.log('The permission has not been requested / is denied but requestable');
					request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then(result => {
						this._request_check_permission();
					});
					break;

				case RESULTS.GRANTED:
					console.log('The permission is granted');
					this._init_app();
					break;

				case RESULTS.UNAVAILABLE:
					Alert.alert(
						"Unfortunately, your device doesn't support BLE",
						'In order to fully utilize Ethernom device, you need to have phone with bluetooth capabilitiy',
						[
							{
								text: 'Cancel',
								onPress: () => console.log('Cancel Pressed'),
								style: 'cancel',
							},
						],
						{cancelable: false},
					);
					break;

				case RESULTS.BLOCKED:
					Alert.alert(
						'Permissions blocked!',
						'In order to fully utilize Ethernom device, please unblock permission on your device',
						[
							{
								text: 'Cancel',
								onPress: () => console.log('Cancel Pressed'),
								style: 'cancel',
							},
						],
						{cancelable: false},
					);
					break;
			}
		}).catch(error => {
			console.log(error);
		});
	}

	/*
	if (Platform.OS === 'android' && Platform.Version >= 23) {
		PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
			if (result) {
				console.log(result);
				this._init_app();
			} else {
				PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
					if (result == "granted") {
						this._init_app();
					}else{
						this._request_check_permission();
					}
				});
			}
		});

	}else if(Platform.OS == "ios"){
		this._init_app_listener();

	}
}

componentWillUnmount() {
	AppState.removeEventListener('change', this._handleAppStateChange);
	EventRegister.removeEventListener(this.listener);
}
*/

/*
this._request_check_permission();
_request_check_permission = () => {
	if(Platform.OS === 'android'){
		check(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then(result => {
			switch (result) {
				case RESULTS.DENIED:
					console.log('The permission has not been requested / is denied but requestable');
					request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then(result => {
						this._request_check_permission();
					});
					break;

				case RESULTS.GRANTED:
					console.log('The permission is granted');
					this._init_app();
					break;

				case RESULTS.UNAVAILABLE:
					Alert.alert(
						"Unfortunately, your device doesn't support BLE",
						'In order to fully utilize Ethernom device, you need to have phone with bluetooth capabilitiy',
						[
							{
								text: 'Cancel',
								onPress: () => console.log('Cancel Pressed'),
								style: 'cancel',
							},
						],
						{cancelable: false},
					);
					break;

				case RESULTS.BLOCKED:
					Alert.alert(
						'Permissions blocked!',
						'In order to fully utilize Ethernom device, please unblock permission on your device',
						[
							{
								text: 'Cancel',
								onPress: () => console.log('Cancel Pressed'),
								style: 'cancel',
							},
						],
						{cancelable: false},
					);
					break;
			}
		}).catch(error => {
			console.log(error);
		});
	}

	/*
	if (Platform.OS === 'android' && Platform.Version >= 23) {
		PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
			if (result) {
				console.log(result);
				this._init_app();
			} else {
				PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
					if (result == "granted") {
						this._init_app();
					}else{
						this._request_check_permission();
					}
				});
			}
		});

	}else if(Platform.OS == "ios"){
		this._init_app_listener();

	}
}

componentWillUnmount() {
	AppState.removeEventListener('change', this._handleAppStateChange);
	EventRegister.removeEventListener(this.listener);
}
*/
