import {Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-community/async-storage';

var SharedPreferences;
if (Platform.OS == "android") SharedPreferences = require('react-native-shared-preferences');

const PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL = "com.ethernom.password.manager.mobile.data.registered_peripheral",
    PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL_NAME = "com.ethernom.password.manager.mobile.data.registered_peripheral_name",
    PSD_SESSION_PIN = "com.ethernom.password.manager.mobile.session.pid",
    PSD_SESSION_PIN_LENGTH = "com.ethernom.password.manager.mobile.pin.length",
    PSD_SESSION_TIMER = "com.ethernom.password.manager.mobile.session.timer",
    
    PSD_MGR_ACCESS_GROUP = "group.com.ethernom.password.manager.mobile";
// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================
module.exports = class StorageAPI {
    constructor() {
        
    }

    register_peripheral_data = async (new_id, new_name) => {
    	var obj = {id: new_id, name: new_name};
    	var obj_string = JSON.stringify(obj);
        var result = await Keychain.setGenericPassword("data", obj_string, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL
		});
		
		this._register_shared_preference_peripheral_data(new_id, new_name);
    };
    
    _register_shared_preference_peripheral_data = (data, per_name) => {
        if (Platform.OS === 'android') {
            SharedPreferences.setItem(PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL, data.toString());
            SharedPreferences.setItem(PSD_MGR_KEYCHAIN_REGISTERED_PERIPHERAL_NAME, per_name.toString());
        }
    };

	save_pin_len = async (len) => {
		var result = await Keychain.setGenericPassword("data", len, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_PIN_LENGTH
		});
	}
	
	get_pin_len = async () => {
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN_LENGTH
        });
        
        if(result == null || result == false){
        	this.save_pin_len(2);
        	return 2;
        }else{
        	return parseInt(result.password);
        }
	}
	
	save_timer = async (time) => {
		var result = await Keychain.setGenericPassword("data", time, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_TIMER
		});
	}
	
	get_timer = async () => {
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_TIMER
        });
        
        if(result == null || result == false){
        	this.save_timer(5);
        	return 5;
        }else{
        	return parseInt(result.password);
        }
	}
	
	save_session_pin = async (peripheral_id, pin) => {
		console.log("Saving new session...");
		var obj = {id: peripheral_id, session: pin, time: get_time()};
		var obj_string = JSON.stringify(obj);
		var result = await Keychain.setGenericPassword("data", obj_string, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_PIN
		});
	}
	
	get_session_pin = async (peripheral_id) => {
		console.log("Getting session...");
		var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
        });
		
		if(result == null || result == false){
        	console.log("Session doesn't exist...");
        	return false
        
        }else{  
        	var obj = JSON.parse(result.password);
        	try{
				if(obj.id == peripheral_id){
					var curr_time = get_time();
					var timeout = await this.get_timer() * 60 * 1000;
					
					console.log(timeout);
					if((curr_time - obj.time) <= timeout){
						console.log("Session still within...");
						return obj.session
					}else{
						console.log("Session expire...");
						return false;
					}
				}
			}catch (e){
				this.remove_session_pin();
				return false;
			}
        }
        
        return false
	}
	
	update_session_time = async () => {
		console.log("Updating session...");
    	var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
        });
        
    	if(result == null || result == false){
    		console.log("Session doesn't exist...");
    		return;
    		
    	}else{
    		console.log("Updating session time...");
    		var obj = JSON.parse(result.password);
			this.save_session_pin(obj.id, obj.session);
			return;
    	}
    }

	remove_session_pin = async () => {
		console.log("Session expire...");
		//await Keychain.resetGenericPassword({ accessGroup: PSD_MGR_ACCESS_GROUP, service: PSD_SESSION_PIN});
	}

    render() {
        return null
    }
}

function get_time(){
	var time = new Date();
	var mls = Date.parse(time);
	return mls;
}

/*

    save_session_pin = async (peripheral_id, pin) => {
    	console.log("Save session pin...");
    	var result = await this._get_sessions_list()
    	var obj = [{id: peripheral_id, session: pin, time: get_time()}];
    	if(result == null || result == false){
    		this._save_sessions_list(obj);
    		return;
    		
    	}else{
    		var list = JSON.parse(result.password);
    		console.log(list);
    		
    		for(var i =0; i<list.length; i++){
        		if(list[i].id == peripheral_id){
        			list[i].session = pin;
        			list[i].time = get_time();
        			this._save_sessions_list(list);
        			return;
        		}
        	}
        	
        	list = list.concat(obj);
        	this._save_sessions_list(list);
        	return;
    	}
    }
    
    update_session_time = async (peripheral_id) => {
    	console.log("Updating session timeout...");
    	var result = await this._get_sessions_list()
    	if(result == null || result == false){
    		return;
    		
    	}else{
    		var list = JSON.parse(result.password);
    		console.log(list);
    		
    		for(var i =0; i<list.length; i++){
        		if(list[i].id == peripheral_id){
        			list[i].time = get_time();
        			this._save_sessions_list(list);
        			return;
        		}
        	}
        	return;
    	}
    }
    
    get_session_pin = async (peripheral_id) => {
    	console.log("Getting session pin...");
    	var result = await this._get_sessions_list()
    	if(result == null || result == false){
        	return false
        
        }else{  
        	var list = JSON.parse(result.password);
        	console.log(list);
        	console.log(peripheral_id);
        	for(var i =0; i<list.length; i++){
        		if(list[i].id == peripheral_id){
        			var curr_time = get_time();
        			var FIVE_MINUTES = 5 * 60 * 1000;
        			
        			console.log(curr_time);
        			console.log(list[i].time);
        			if((curr_time - list[i].time) <= FIVE_MINUTES){
        				return list[i].session
        			}else{
        				return false;
        			}
        		}
        	}
        	
        	return false;
        }
    }
    
    _get_sessions_list = async () => {
    	console.log("Getting session list...");
    	var result = await Keychain.getGenericPassword({
            accessGroup: PSD_MGR_ACCESS_GROUP,
            service: PSD_SESSION_PIN
        });
        return result;
    }
    
    _save_sessions_list = async (list) => {
    	console.log("Saving list...");
    	console.log(list);
    	var list_string = JSON.stringify(list);
    	var result = await Keychain.setGenericPassword("data", list_string, {
			accessGroup: PSD_MGR_ACCESS_GROUP,
			service: PSD_SESSION_PIN
		});
		
		return result 
    }

_save_mode = async (convenient) => {
	// var new_data_obj = {mode: convenient}
	// await Keychain.setGenericPassword("data", JSON.stringify(new_data_obj), {service: PSD_MGR_MODE});

	//console.log('save mode: ' + convenient)
};


_get_mode = async () => {
	let result = await Keychain.getGenericPassword({service: PSD_MGR_MODE});
	if (result != null) {
		let obj = JSON.parse(result.password);

		//console.log('Credentials successfully loaded for user ' + result.password);

		return obj.mode

	} else {
		this._save_mode(true);

		return true;
	}
};
*/
