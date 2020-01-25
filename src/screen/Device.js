import React, {Component} from 'react';
import {Alert, ActivityIndicator, View, FlatList, Image, StyleSheet, StatusBar, AppState, Settings} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content, Toast} from 'native-base';
import {ListItem} from "react-native-elements";
import Icon from "react-native-vector-icons/dist/Ionicons";
import Dialog from "react-native-dialog";
import { EventRegister } from 'react-native-event-listeners'

let s = require('../css/main_style');

//ETHERNOM API;
import {EthernomAPI} from '@ethernom/ethernom-api';
import {PSD_MGR} from '@ethernom/ethernom_msg_psd_mgr';
import {VERSION_MGR} from '@ethernom/ethernom_version_mgr';
var PSD_MGR_API = new PSD_MGR();

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

//E_API RECONNECT API
const E_API_Reconnect = require('../util/E_API_Manager.js');

const company = 'Ethernom, Inc.',
	name = 'Password Manager',
	bundle = 'com.ethernom.password.manager.mobile',
	version = '1.2.9',
	group = 'group.com.ethernom.password.manager.mobile';

export default class Device extends Component<Props> {
	device_list = [];
	MAIN_DISCOVERY = null;
	VERSION_MGR_API = new VERSION_MGR(PSD_MGR_API.APP_ID, company, name, bundle, version, group);

	CURR_E_API = null;
	connection_timeout_occur = false;

	constructor(props) {
	super(props);
		this.state = {
			appState: AppState.currentState,
			device_list: [],
			alert: {connection: false, internet: false, force: false, update: false, battery: false},
		};
		this.tutorial_screen = Settings.get('TUTORIAL_SCREEN');
	}

	componentDidMount() {
		this._init_e_api_scanner();
		this._focus_listener();

		AppState.addEventListener('change', this._handleAppStateChange);
		if (this.tutorial_screen === 1) {
		  const {navigate} = this.props.navigation;
		  this.props.navigation.navigate('Autofill_Screen', {from: 'DEVICE'});
		}

		global.state.setState({ curr_device: {id: '', name: '', sn: '', connected: false} });

		const {navigate} = this.props.navigation;
		global.navigate = navigate;
		global.reconnect_manager = new E_API_Reconnect();
	}

	componentWillUnmount() {
		this.did_focus_device_screen.remove();
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_focus_listener = () => {
		const {navigation} = this.props;
		this.did_focus_device_screen = navigation.addListener('didFocus', () => {
			global.state.setState({spinner: {visible: false, text: ''}});
			this.device_list = [];
			this.setState({device_list: []});
		});
	};

	_handleAppStateChange = nextAppState => {
		if(this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
			this._init_e_api_scanner();
		}else if(nextAppState === 'background') {
			this._request_cancel_usage();
			global.bottom_sheets_device.close();

			const {navigate} = this.props.navigation;
			navigate('Device_Screen');

			global.credentials_list = [];
			global.state.setState({
				spinner: {visible: false, text: ''},
				curr_device: {id: '', name: '', sn: '', connected: false},
			});
		}
		this.setState({appState: nextAppState});
	};

	/*
	============================================================================================================
	======================================== SCANNER DEVICE ====================================================
	============================================================================================================
	*/
	_init_e_api_scanner = async () => {
		if (this.MAIN_DISCOVERY != null) {
			this.MAIN_DISCOVERY.DisconnectListeners();
			this.MAIN_DISCOVERY = null;
		}

		var TEMP_E_API = await new EthernomAPI('BLE', PSD_MGR_API.SERIVCE_PORT, -1, true, true, async resultCode => {
			if (resultCode == ETH_SUCCESS) {
				this.MAIN_DISCOVERY = await TEMP_E_API;
				this.MAIN_DISCOVERY.DiscoverDevices(this._device_discovery);
			}
		});
	}

	_device_discovery = (resultCode, deviceID, deviceName, deviceSN) => {
    	var obj = [{id: deviceID, name: deviceName, sn: deviceSN}];
    	if(this.device_list.length > 0){
			for(var i=0; i<this.device_list.length; i++){
				if(this.device_list[i].id == deviceID && this.device_list[i].sn == deviceSN && this.device_list[i].name == deviceName){				
					return;
					
				}else if(this.device_list[i].id == deviceID && (this.device_list[i].sn != deviceSN || this.device_list[i].name != deviceName)){
					var update_list = false;
					if(this.device_list[i].name != deviceName){
						update_list = true;
						this.device_list[i].name = deviceName;
					}
					
					if(this.device_list[i].sn != deviceSN){
						update_list = true;
						this.device_list[i].sn = deviceSN;
					}
					
					if(update_list == true){
						this.setState({device_list: []}, () => {
							this.setState({device_list: this.device_list});
						});
					}
					return;
				}
			}
		}
		
		this.device_list = this.device_list.concat(obj);
		this.setState({ device_list: this.device_list })
    }

	/*
	============================================================================================================
	======================================= CONNECTING DEVICE ==================================================
	============================================================================================================
	*/
	_request_connect_device = item => {
		var deviceID = item.id, deviceName = item.name, deviceSN = item.sn;
		this._init_e_api_device(deviceID, deviceName, deviceSN);
	};

	_init_e_api_device = async (deviceID, deviceName, deviceSN) => {
		var E_API = await new EthernomAPI('BLE', PSD_MGR_API.SERIVCE_PORT, 0, false, true, async resultCode => {
			if (resultCode === ETH_SUCCESS) {
				this.CURR_E_API = await E_API;
				this._device_select(deviceID, deviceName, deviceSN);
			}
		});
	};

	_device_select = (deviceID, deviceName, deviceSN) => {  
        if(this.connection_timeout_occur == false){
        	global.state.setState({ spinner: {visible: true, text: "Loading: Connecting " + deviceName + "..."} });
        }
        
        var parent = this;
		this.connection_timeout = setTimeout(function () {
			console.log("Taking too long...");
			
			parent.connection_timeout_occur = true;
			parent.CURR_E_API.CardClose(callback = (resultCode) => {
				parent.CURR_E_API.UnSubscribeToUnsolictedEvents();
				parent.CURR_E_API.DisconnectListeners();
				parent.CURR_E_API = null;
			});
			
			global.state.setState({ spinner: {visible: false, text: ""} });
			setTimeout(function () {
				parent.setState({ alert: {connection: true, internet: false, force: false, update: false, battery: false} })
			}, 600);
			//parent._init_e_api_device(deviceID, deviceName, deviceSN);
		}, 5000);
        
        console.log('DEVICE_SELECTING: ', deviceID, deviceName, deviceSN);
        this.CURR_E_API.Select(deviceID, deviceSN, deviceName, async (resultCode) => {
            if (resultCode === ETH_SUCCESS) {
                clearTimeout(this.connection_timeout);
                this.connection_timeout_occur = false;
                
                if(this.state.alert.connection == true){
                	this.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: false} });
                	
                	setTimeout(function () {
                		global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
                	}, 600);
                }else{
					global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
				}
				global.E_API = await this.CURR_E_API;
				this.CURR_E_API = null;
				
				this._request_app_auth();
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
    	if(global.state.state.spinner.visible == false){
    		setTimeout(function () {
    			global.state.setState({ spinner: {visible: true, text: "Loading: Verifying connection..."} });
    		}, 600);
    	}
    	
    	this.VERSION_MGR_API.request_app_auth(global.E_API, callback = async (E_API, authenticated) => {
    		global.E_API = await E_API;
    		
    		//authenticated = false;
    		if(authenticated === true){
				this._request_check_version();
			}else if(authenticated == -1){
				//this._request_cancel_usage();
				global.state.setState({ spinner: {visible: false, text: ""} });
				let parent = this;
				setTimeout(function () {
					parent.setState({ alert: {connection: false, internet: true, force: true, update: false, battery: false} });
				}, 600);
			}else{
				global.state.setState({ spinner: {visible: false, text: ""} });
				let parent = this;
				setTimeout(function () {
					parent.setState({ alert: {connection: false, internet: false, force: true, update: false, battery: false} });
				}, 600);
			}
		});
    }
    
    _request_check_version = () => {
    	console.log("Checking version...");
    	if(global.state.state.spinner.visible == false){
    		setTimeout(function () {
    			global.state.setState({ spinner: {visible: true, text: "Loading: Checking compatibility..."} });
    		}, 600);
    	}else{
    		global.state.setState({ spinner: {visible: true, text: "Loading: Checking compatibility..."} });
    	}
    	
    	this.VERSION_MGR_API.request_check_version(global.E_API, callback = async (E_API, updates) => {
    		global.E_API = await E_API;
			
			//updates = true;
			if(updates === true){
				global.state.setState({ spinner: {visible: false, text: ""} });
				let parent = this;
				setTimeout(function () {
					parent.setState({ alert: {connection: false, internet: false, force: false, update: true, battery: false} })
				}, 600);
				
			}else{
				this._request_check_battery_level();
			}
		});
    }

    _request_check_battery_level = () => {
    	console.log("Checking battery...");
    	if(global.state.state.spinner.visible == false){
    		setTimeout(function () {
    			global.state.setState({ spinner: {visible: true, text: "Loading: Checking battery level.."} });
    		}, 600);
    	}else{
    		global.state.setState({ spinner: {visible: true, text: "Loading: Checking battery level.."} });
    	}
    	
		this.VERSION_MGR_API.request_check_battery(global.E_API, callback = async (E_API, battery_low) => {
    		global.E_API = await E_API;
    		
    		//battery_low = true;
			if(battery_low == true){
				global.state.setState({ spinner: {visible: false, text: ""} });
				let parent = this;
				setTimeout(function () {
					parent.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: true} })
				}, 600);

			}else{
				this._request_launch_card_app();
			}
		});
    }

	handle_request_launch_dm_app = () => {
        this.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: false} }, () => {
        	this.VERSION_MGR_API.request_launch_dm(global.E_API.currID, global.E_API.currName);
			this._request_cancel_usage();
		});
    };

    handle_check_battery_level = () => {
        this.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: false} }, () => {
        	this._request_check_battery_level()
        });
    };

    handle_launch_card_app = () => {
        this.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: false} }, () => {
        	this._request_launch_card_app();
        });
    };

	/*
	============================================================================================================
	======================================= CANCEL/SUSPEND =====================================================
	============================================================================================================
	*/
	_request_cancel_usage = () => {
    	if(this.connection_timeout != null) clearTimeout(this.connection_timeout);
		this.connection_timeout_occur = false;
		
		if(this.CURR_E_API != null){
			this.CURR_E_API.CardClose(callback = (resultCode) => {
				if (resultCode === ETH_SUCCESS) {
					this.CURR_E_API = null;
				}
			});
		}
    
    	if(global.E_API != null){
			global.E_API.CardClose(async (resultCode) => {
				if (resultCode === ETH_SUCCESS) {
					global.E_API = null;
				}
			})
		}
		
		if(this._isMounted){
			this.device_list = [];
			this.setState({ device_list: [] });
		
			global.state.setState({ spinner: {visible: false, text: ""} });
			this.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: false} });
		}
	};
	
    _request_suspend_app = () => {
    	if(global.E_API != null){
    		global.E_API.DisconnectApp((resultCode) => {
    			 if(resultCode === ETH_SUCCESS){
                    global.E_API = null;
    			 }
    		});
    	}
    	
    	if(this._isMounted){
    		this.device_list = [];
			this.setState({ device_list: [] });
		
			global.state.setState({ spinner: {visible: false, text: ""} });
			this.setState({ alert: {connection: false, internet: false, force: false, update: false, battery: false} });
		}
    };
    

	/*
	============================================================================================================
	========================================= LAUNCH APP =======================================================
	============================================================================================================
	*/
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
		global.E_API.OnCardDisconnected(resultCode => {
			if (resultCode === ETH_SUCCESS) {
				console.log('On card disconnected...');

				global.state.setState({
					spinner: {visible: false, text: ''},
					curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false},
					bottom_sheets_height: 160,
				});
				EventRegister.emit('DEVICE_STATUS', false);
				global.E_API = null;
			}
		});

		var session = await Storage.get_session_pin(global.E_API.currID);
		this.len = await Storage.get_pin_len();
		if (this.len) {
			if (session == null || session == false) {
				this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, null, this.len, this._session_callback);
			} else {		
				this.curr_PIN = session;
				this.VERSION_MGR_API.request_session(global.E_API, PSD_MGR_API.APP_ID, global.device_name, session, this.len, this._session_callback);
			}
		}
	};

	_session_callback = (new_PIN) => {
		if (new_PIN == false) {
			Storage.update_session_time();
			this._init_password_manager();
		} else {
			const {navigate} = this.props.navigation;
			navigate('PIN_Entry_Screen', {new_pin: new_PIN, pin_len: this.len});
		}
	};
	
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
			global.state.setState({ spinner: {visible: true, text: "Loading: Starting password manager..."} });
			global.E_API.DoAppKeyExchange(this.curr_PIN, resultCode => {
				if (resultCode === ETH_SUCCESS) {
					console.log('pin entry key exchange success');
					
					global.state.setState({ 
						spinner: {visible: true, text: 'Loading: Retrieving credentials...'},
						curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true},
						bottom_sheets_height: 110,
					});

					Storage.register_peripheral_data(global.E_API.currID, global.E_API.currName);
					const {navigate} = this.props.navigation;
					navigate('Vault_Screen');
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
		if (global.E_API !== null) {
			global.E_API.WriteJSON_Encrypted(out_msg, in_msg, true, (resultCode, msg) => {
				if (resultCode === ETH_SUCCESS) {
					var msg_obj = JSON.parse(msg);
					this._process_reply_command(msg_obj);
				}
			});
		
		} else {
			console.log("E_API, doesn't exist");
		}
	};

	_process_reply_command = msg => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_INIT:
				if (msg.response === PSD_MGR_API.AWK) {
					console.log('Successfully init');
					this._start_key_exchange();
					
				} else {
					console.log('Fails init');
					this._request_cancel_usage();
				}
				break;

			default:
				break;
		}
	};

  /*
	============================================================================================================
	=========================================== RENDER =========================================================
	============================================================================================================
	*/
	
	_handle_navigate_settings = () => {
		const { navigate } = this.props.navigation;
		navigate("Settings_Screen");
	}
	
	_handle_alert_scanning = () => {
		Alert.alert('Unable to see your device?', 'Pleas make sure your device is powered on and authenticated.',
			[
				{text: 'Dismiss'},
			],
			{cancelable: false},
		);
	}
	
	render() {
		return (
			<Container>
				<View>
					<Dialog.Container visible={this.state.alert.connection}>
						<Dialog.Title>Error:</Dialog.Title>
						<Dialog.Description>
							Make sure your device is power on, and is authenticated, please try again.
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => { this._request_cancel_usage() }} />
					</Dialog.Container>
				
					<Dialog.Container visible={this.state.alert.internet}>
						<Dialog.Title>No internet connection!</Dialog.Title>
						<Dialog.Description>
							Please make sure you have wifi or cellular connection, try again!
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => {this._request_cancel_usage() }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert.force}>
						<Dialog.Title>Updates required!</Dialog.Title>
						<Dialog.Description>
							You must update your device! please use Ethernom Device Manager Application.
						</Dialog.Description>
						<Dialog.Button label="Update device" onPress={() => { this.handle_request_launch_dm_app() }} />
					</Dialog.Container>
			
					<Dialog.Container visible={this.state.alert.update}>
						<Dialog.Title>Updates required!</Dialog.Title>
						<Dialog.Description>
							To update your device, please use Ethernom Device Manager Application.
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => {this._request_cancel_usage() }} />
						<Dialog.Button label="Ignore update" onPress={() => {this.handle_check_battery_level() }} />
						<Dialog.Button label="Update device" onPress={() => {this.handle_request_launch_dm_app() }} />
					</Dialog.Container>
					
					<Dialog.Container visible={this.state.alert.battery}>
						<Dialog.Title> Battery low!</Dialog.Title>
						<Dialog.Description>
							Please charge your device using the USB accessory.
						</Dialog.Description>
						<Dialog.Button label="Dismiss" onPress={() => {this._request_cancel_usage() }} />
						<Dialog.Button label="Ignore warning" onPress={() => {this.handle_launch_card_app() }} />
					</Dialog.Container>
				</View>
			
				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor= '#d7b43e' barStyle="light-content" />
					<Left style={{flex: 3, marginLeft: 8}}>
						<Button iconLeft transparent disabled={true}>
							<Image source={require('../assets/icon.png')} size={20} style={{width: 25, height: 25, resizeMode:'contain'}} />
						</Button>
					</Left>
					<Body style={{flex: 3}}><Title style={{color:'black'}}>Device</Title></Body>
					<Right style={{flex: 3}}>
						<Button iconLeft transparent onPress={() => this._handle_navigate_settings()}>
							<Image source={require('../assets/settings.png')} size={20} style={{width: 30, height: 30, resizeMode:'contain'}} />
						</Button>
					</Right>
				</Header>
				
				<View style={[s.eth_btn_full], {borderBottomColor: '#DCDCDC', borderBottomWidth: 1, height: 55}}>
					<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
						<ActivityIndicator size="small" style={{marginLeft:16}}/>
						<Text style={{color: 'black', marginLeft: 18}}>Search for nearby devices...</Text>
						<Button transparent onPress={() => this._handle_alert_scanning()} style={{justifyContent: 'center', position: 'absolute', right: 0, width: 55}}><Icon name={'ios-help'} color="#282828" size={30}/></Button>
					</View>
				</View>
				
				<Content>
					<View style={[s.container_list2]}>
						<FlatList
							data= {this.state.device_list}
							renderItem={({ item }) => (
								<ListItem button
									onPress={async () => {await this._request_connect_device(item)}}
									title={item.name} subtitle={item.sn} rightIcon = {{name: "add"}}
									bottomDivider
								/>
							)}
							keyExtractor={(item, index) => index.toString()}
						/>
					</View>
				</Content>
			</Container>
		);
	}
}
/*
<Container>
	<Header style={{backgroundColor: "#cba830"}}>
		<StatusBar backgroundColor= '#d7b43e' barStyle="light-content" />
		<Left style={{flex: 3}}>
			<Button iconLeft transparent onPress={async () => {
				await this.handleBackToVault()
			}} disabled={true}>
				<Image source={require('../../assets/icon.png')} size={20} style={{width: 22, height: 22,resizeMode:'contain'}} color="white" />
			</Button>
		</Left>
		<Body style={{flex: 1}}><Title style={{color:'black'}}>Vault</Title></Body>
		<Right style={{flex: 3}}>
			<Button iconLeft transparent onPress={() => this.handleSettingClick()}>
				<Image source={require('../../assets/settings.png')} size={20} style={{width: 30, height: 30,resizeMode:'contain'}} color="white" />
			</Button>
		</Right>
	</Header>
	<Content>

		<View style={[s.container_header_title,{backgroundColor: 'white', borderBottomWidth: 1, borderColor:'#EEEEEE', justifyContent:'center',alignItems:'center'}]}>
			<View style={{width: 20, height: 20, marginStart: 0}}>
				<Animated.Image
					style={{ height: 25, width: 25, resizeMode: 'contain', transform: [{rotate: spin}] }}
					source={require('../../assets/img/refresh_button.png')} />

			</View>
			<View style={{width:'80%', marginLeft: 15}}>
				<Text style={{fontSize: 16}}>Search for nearby devices...</Text>
			</View>
			<View style={{width: 20, height: 20, marginTop: -30, marginLeft: -20}}>
				<Button transparent onPress={() => this.handle_help()}>
					<Image source={require('../../assets/img/question_mark.png')} style={[{width: 15, height: 15}, styles.localImage]}/>
				</Button>
			</View>
		</View>

		<View style={[s.container_list2]}>
			<FlatList
				data= {this.state.device_list}
				renderItem={({ item }) => (
					<ListItem button
							  onPress={async () => {await this._request_connect_device(item)}}
							  title={item.name} subtitle={item.sn} chevron={{color: "#cba830", size: 20}}
							  bottomDivider
					/>
				)}
			/>
		</View>
	</Content>

	<Footer style={{display: this.state.switchDevice ? 'flex' : 'none'}}>
		<Button full style={[{backgroundColor: '#cba830'}, s.container_header_title]} onPress={async () => {await this.handleBackToVault()}}>
			<View style={{width: "10%",justifyContent: 'center', alignItems: 'center'}}>
				<Icon name='ios-arrow-back' size={25} color="black" style={{justifyContent: 'center',alignItems: 'center'}}/>
			</View>
			<View style={{width: "90%",justifyContent:'center', alignItems: 'center'}}>
				<Text style={{color: 'black', textAlign:'center'}}>BACK</Text>
			</View>
		</Button>
	</Footer>
</Container>
*/

const styles = StyleSheet.create({
  localImage: {
    transform: [{scale: 1}],
    alignSelf: 'center',
    resizeMode: 'contain',
  },
});

function makeCode(length) {
  var result = '';
  var characters = 'abcdef0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
