import React, {Component} from 'react';
import {View, Image, StatusBar, Keyboard, ScrollView, Dimensions} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Input, Label, Footer, Toast} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import KeyboardStickyView from 'rn-keyboard-sticky-view';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import Dialog from "react-native-dialog";
import { EventRegister } from 'react-native-event-listeners';

var deviceWidth = Dimensions.get("window").width;
var s = require('../css/styles');

import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
var PSD_MGR_API = new PSD_MGR();

const parseDomain = require("parse-domain");
const punycode = require('punycode');

type Props = {};
export default class Add_Account extends Component<Props> {
    constructor(props) {
        super(props);
        const { navigation } = this.props;
        this.state = {
        	name: '', 
            url: navigation.getParam('url', ''), 
            username: '', 
            password: '', 
            hidden: true, 
            isSavable: false,
            alert: {error: false, overwrite: false},
            error_text: '',
            connected: global.state.state.curr_device.connected
        };
        
        this.add = true;
    }
    	
    componentDidMount(){
    	this._subsribe_device_status_listener();
    	this._focus_listener();
    };
    
    componentWillUnmount(){
    	EventRegister.removeEventListener(this.device_status_listener);
    	if(this.did_focus_screen != null) this.did_focus_screen.remove();
    };
    
    _focus_listener = () => {
		if(this.did_focus_screen != null) this.did_focus_screen.remove();
    	const { navigation } = this.props;
		this.did_focus_screen = navigation.addListener('didFocus', () => {
			this.setState({
				connected: global.state.state.curr_device.connected
			})
		});
    }
    
    _subsribe_device_status_listener = () => {
		if(this.device_status_listener != null) EventRegister.removeEventListener(this.device_status_listener);
		this.device_status_listener = EventRegister.addEventListener('DEVICE_STATUS', (status) => {
            this.setState({ connected: status });
        })
	}
    
    _reset_state = () => {
        this.setState({
            name: '', url: '', username: '', password: '', 
            hidden: true, 
            isSavable: true,
            alert: {error: false, overwrite: false},
            error_text: ''
        });
    };
    
    _handle_hide_show = () => {
        this.setState({ hidden: !this.state.hidden })
    };

	/*
    _handle_detect_space= async ()=>{
        if (await /\s/.test(this.state.url))
            this.setState({url: this.state.url.trim()});
        if (await /\s/.test(this.state.username))
            this.setState({username: this.state.username.trim()});
        if (await /\s/.test(this.state.password)) {
            this.setState({password: this.state.password.trim()})
        }
    };
	*/
	
    _handle_save_account = () => {
        Keyboard.dismiss();
        
        var result = parse_URL(this.state.url)
    	if(result == false){
    		var parent = this;
			setTimeout(function () {
				parent.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Invalid URL, try again with a valid URL.'
				})
			}, 300);
    		return;
    	}
    	
    	this.official_url = result;
    
        if(global.credentials_list.length == 0) {
            this._validate_entry();
        
        }else{
        	for(var i = 0; i<global.credentials_list.length; i++){
        		var temp = global.credentials_list[i].url.toLowerCase();
        		if(temp.includes(this.official_url) && this.state.username == global.credentials_list[i].username){
        			var parent = this;
					setTimeout(function () {
						parent.setState({
							alert: {error: true, overwrite: false},
							error_text: 'Account already exist, try again with a different sets of credentials.'
						})
					}, 300);
        			return;
        		}
        	}
        	
        	this._validate_duplicate_name();
        }
    };
    
    _validate_duplicate_name = () => {
    	for(var i = 0; i<global.credentials_list.length; i++){
			if(this.state.name == global.credentials_list[i].key){
				var parent = this;
				setTimeout(function () {
					parent.setState({
						alert: {error: true, overwrite: false},
						error_text: 'Account\'s name already exist, try again with a different name.'
					})
				}, 300);
				return;
			}
		}
    	
    	this._validate_entry();
    }
    
    _validate_entry = () => {
    	var error = false;
    	if (!this.isASCII(this.state.name) || !this.isASCII(this.state.url) || !this.isASCII(this.state.username) || !this.isASCII(this.state.password)) {
    		error = true;
    	}
    	
    	if(error == false){
    		this._check_account();
    	}else{
    		var parent = this;
			setTimeout(function () {
				parent.setState({
					alert: {error: true, overwrite: false},
					error_text: 'Credentials contains special characters.'
				})
			}, 300);
    	}
    }
    
    /*
	============================================================================================================
	====================================== HANDLER/LOGIC =======================================================
	============================================================================================================
	*/
    _handle_dismiss_dialog = () => {
    	this.setState({ alert: {error: false, overwrite: false}, error_text: "" });
    };
    
    _check_account = () => {
    	this.add = true;
    	
    	global.state.setState({ spinner: {visible: true, text: "Loading: Adding account..."} });
    
    	var out_msg = PSD_MGR_API.outMsg_request_checkAccount(this.official_url, this.state.username, this.state.password);
        var in_msg = PSD_MGR_API.inMsg_reply_generic();
    	this._write_card(out_msg, in_msg);
    }

    _handle_add_account = () => {
		var out_msg = PSD_MGR_API.outMsg_request_addAccount(this.official_url, this.state.username, this.state.password, this.state.name);
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		this._write_card(out_msg, in_msg);
	}
	
	_handle_override_account =() => {
		this.add = false;
		
		this.setState({ alert: {error: false, overwrite: false}, error_text: "" });
        global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} });
        
		var out_msg = PSD_MGR_API.outMsg_request_editAccount(this.official_url, this.state.username, this.state.password, this.state.name);
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		this._write_card(out_msg, in_msg);
    };
	
	/*
	============================================================================================================
	======================================== WRITE/READ ========================================================
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
			global.reconnect_manager.request_reconnect(global.state.state.curr_device.id, global.state.state.curr_device.name, global.state.state.curr_device.sn, async (done) => {
				if(this.add == true){
					global.state.setState({ spinner: {visible: true, text: "Loading: Adding account..."} });
				}else{
					global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} });
				}
				
				global.state.setState({
					curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true},
					bottom_sheets_height: 110
				})
				
				this._write_card(out_msg, in_msg);
			});
        	
        }
    };
    
    _process_reply_command = (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_ADD_ACCOUNT:
                if (msg.response === PSD_MGR_API.AWK) {
                    console.log("add successfull");
                    var obj = [{key: this.state.name, url: this.official_url, username: this.state.username}];
                    global.credentials_list = obj.concat(global.credentials_list);
                    
                    Toast.show({
						text: "Successfully added account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					})
                    
                    const {navigate} = this.props.navigation;
					navigate('Vault_Screen');
					global.state.setState({ spinner: {visible: false, text: ""} });
                    
                } else {
                    console.log("can't add account");
                    
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    var parent = this;
					setTimeout(function () {
						parent.setState({
							alert: {error: true, overwrite: false},
            				error_text: 'Add account fails, try again.'
            			})
					}, 300);
                }
                break;
			
			 case PSD_MGR_API.C2H_RPLY_EDIT_ACCOUNT:
                if (msg.response === PSD_MGR_API.AWK) {
                	for(var i = 0; i<global.credentials_list.length; i++){
						if(this.official_url == global.credentials_list[i].url && this.state.username == global.credentials_list[i].username){
							global.credentials_list[i].key = this.state.name
							global.credentials_list[i].url = this.official_url
							global.credentials_list[i].username = this.state.username
							break;
						}
					}
					
					Toast.show({
						text: "Successfully edited account",
						buttonText: "Okay",
						position: "bottom",
						duration: 4000,
						type: "success"
					})
					
					const {navigate} = this.props.navigation;
					navigate('Vault_Screen');
					
					global.state.setState({ spinner: {visible: false, text: ""} });
					
                }else{
                	console.log("can't edit account");
                	
                	global.state.setState({ spinner: {visible: false, text: ""} });
                    var parent = this;
					setTimeout(function () {
						parent.setState({
							alert: {error: true, overwrite: false},
            				error_text: 'Edit account fails, try again.'
            			})
					}, 300);
                }
				break;
				
			case PSD_MGR_API.C2H_RPLY_CHECK_ACCOUNT:
                if (msg.response === PSD_MGR_API.NAK) {
                    console.log("C2H_RPLY_CHECK_ACCOUNT: No Duplicates found");
                    this._handle_add_account();
                    
                } else if (msg.response === PSD_MGR_API.AWK) {
                    console.log("C2H_RPLY_CHECK_ACCOUNT: exist , Duplicates but different in password");
                    global.state.setState({ spinner: {visible: false, text: ""} });
                    var parent = this;
					setTimeout(function () {
						parent.setState({
							alert: {error: false, overwrite: true},
            				error_text: ''
            			})
					}, 300);
                    
                } else if (msg.response === PSD_MGR_API.OTHER) {
                    console.log("C2H_RPLY_CHECK_ACCOUNT: Duplicates exact");
					global.state.setState({ spinner: {visible: false, text: ""} });                   
                    var parent = this;
					setTimeout(function () {
						parent.setState({
							alert: {error: true, overwrite: false},
							error_text: 'Account already exist, try again with a different sets of credentials.'
						})
					}, 300);
                }
                break;
				
			default:
				break;
		};
    };
    
    /*
	============================================================================================================
	======================================== TEXT/LOGIC ========================================================
	============================================================================================================
	*/
	//.replace(/\s/g, '')
    _handle_text_change = async (txt, type) => {
		if (type === 'name' && txt.length <= 31)
			await this.setState({name: txt});
		else if (type === 'url' && txt.length <= 94)
			await this.setState({url: txt});
		else if (type === 'username' && txt.length <= 63)
			await this.setState({username: txt});
		else if (type === 'password' && txt.length <= 63)
			await this.setState({password: txt});

		this.handleOnChange();
    };
    
    handleOnChange = () => {
        this.setState({isSavable:false});
        if(this.state.name !== "" && this.state.url !== "" && this.state.username !== "" && this.state.password !== ""){
            if(this.state.name.trim().length <= 0 || this.state.url.trim().length <= 0 || this.state.username.trim().length <= 0 || this.state.password.trim().length <= 1){
                this.setState({isSavable: false});
            } else {
                this.setState({isSavable: true});
            }
        } else {
            this.setState({isSavable: false});
        }
    };
    
    isASCII = (str) => {
    	return /^[\x00-\x7F]*$/.test(str);
    };
    
     /*
	============================================================================================================
	========================================= NAVIGATE =========================================================
	============================================================================================================
	*/
	_handle_navigate_add_staging = () => {
    	const {navigate} = this.props.navigation;
		this.props.navigation.navigate("Add_Staging_Screen");
    }
    
    _handle_open_bottom_sheets_device = () => {
    	global.bottom_sheets_device.open();
    }
	
	render() {
		return (
			<Container>
				<View>
					<Dialog.Container visible={this.state.alert.error}>
						<Dialog.Title>Error!</Dialog.Title>
						<Dialog.Description>{this.state.error_text}</Dialog.Description>
						<Dialog.Button label="Ok" onPress={() => { this._handle_dismiss_dialog(); }} />
					</Dialog.Container>

					<Dialog.Container visible={this.state.alert.overwrite}>
						<Dialog.Title>Account already exist</Dialog.Title>
						<Dialog.Description>Do you want to edit your current account?</Dialog.Description>
						<Dialog.Button label="Cancel" onPress={() => { this._handle_dismiss_dialog(); }} />
						<Dialog.Button label="Ok" onPress={() => { this._handle_override_account(); }} />
					</Dialog.Container>
				</View>
			
				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor='#d7b43e' barStyle="light-content"/>
					<Left style={{flex: 3, marginLeft: 8}}><Button onPress={() => {this._handle_navigate_add_staging();}} transparent><Text style={{color: 'black'}}>Back</Text></Button></Left>
					<Body style={{flex: 4}}><Title style={{color:'black'}}>Vault</Title></Body>
					<Right style={{flex: 3}}><Button onPress={() => {this._handle_save_account();}} disabled={!this.state.isSavable} transparent><Text style={{color: !this.state.isSavable ? '#ccc' : 'black'}}>Save</Text></Button></Right>
				</Header>

				<View style={[s.container]}>
					<View style={[s.container_list, {backgroundColor: 'white'}]}>
						<Button onPress={() => this._handle_open_bottom_sheets_device()} full style={[s.eth_btn_full, s.bg_black, {backgroundColor: 'black', height: 60}]} >
							<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
								<Icon name={'ios-radio-button-on'} color={this.state.connected ? "#ADFF2F" : "red"} style={{marginLeft: 15}} size={30}/>
								<Text style={{color: 'white', fontWeight: 'bold'}}>{global.state.state.curr_device.name}</Text>
								<Icon style={{marginRight: 18, position: 'absolute', right: 0}} name={'ios-settings'} color="white" size={20}/>
							</View>
						</Button>
					
						<View style={[s.container_header_title,{justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE', backgroundColor: 'white'}]}>
							<Text style={{marginTop:5}}>Add account</Text>
						</View>

						<KeyboardAwareScrollView extraScrollHeight={55}>
							<ScrollView style={{marginBottom: 55}}>
								<Form>
									<Item stackedLabel>
										<Label style={{fontSize: 12}}>Display name:</Label>
										<Input keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} onChangeText={(text) => this._handle_text_change(text, 'name')} maxLength={31} autoCorrect={false} value={this.state.name}/>
									</Item>
								
									<Item stackedLabel>
										<Label style={{fontSize: 12}}>URL:</Label>
										<Input keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} onChangeText={(text) => this._handle_text_change(text, 'url')} maxLength={94} autoCapitalize="none" autoCorrect={false} value={this.state.url}/>
									</Item>
					
									<Item stackedLabel>
										<Label style={{fontSize: 12}}>Username:</Label>
										<Input keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} onChangeText={(text) => this._handle_text_change(text, 'username')} maxLength={63} autoCapitalize="none" autoCorrect={false} value={this.state.username}/>
									</Item>

									<Item stackedLabel last>
										<Label style={{fontSize: 12}}>Password:</Label>
										<View style={{flex: 1, flexDirection: 'row'}}>
											<Input style={{width: '60%'}} maxLength={63} autoCapitalize="none" autoCorrect={false} keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'}
												onChangeText={(text) => this._handle_text_change(text, 'password')}
												secureTextEntry={this.state.hidden} value={this.state.password}
											/>
											<Button style={{width: 30, marginTop: 0, marginRight: 15}} onPress={() => this._handle_hide_show()} transparent>
												<Icon name= { this.state.hidden ? 'ios-eye' : 'ios-eye-off'} size={25} color="#cba830"/>
											</Button>
										</View>
									</Item>
								</Form>
							</ScrollView>
						</KeyboardAwareScrollView>
					</View>
				</View>
			</Container>
		);
	}
}

/*
<KeyboardStickyView>
	<Footer style={{flexDirection: 'row', backgroundColor: 'white'}}>
		<Button transparent full style={{flexDirection: "row", backgroundColor: '#cba830', width: '50%', height:55, marginEnd: 0.5, borderRadius: 0}}
			onPress={() => {this.props.navigation.navigate("Add_Staging_Screen");}}>
			<Icon  reverse  name='ios-arrow-back'  type='ionicon'  color='black' size={20}  style={{marginLeft: 2}}/>
			<Text style={{fontSize: 15 ,color: 'black'}}>Back</Text>
		</Button>
		<Button transparent full style={{flexDirection: "row",  backgroundColor: this.state.isSavable ? '#cba830': '#9E9E9E', width: '50%', height:55,borderRadius: 0}}
			onPress={() => { this._handle_save_account(); }} disabled={!this.state.isSavable}>
			<Text style={{fontSize: 15, color: 'black'}}>Save</Text>
			<Icon reverse  name='ios-save' type='ionicon' color='black' size={20} style={{marginRight: 2}} />
		</Button>
	</Footer>
</KeyboardStickyView>

<View>
	<Dialog.Container visible={this.state.alert.error}>
		<Dialog.Title>Error!</Dialog.Title>
		<Dialog.Description>{this.state.error_text}</Dialog.Description>
		<Dialog.Button label="Ok" onPress={this._handle_dismiss_dialog()}/>
	</Dialog.Container>

	<Dialog.Container visible={this.state.alert.overwrite}>
		<Dialog.Title>Account already exist</Dialog.Title>
		<Dialog.Description>Do you want to overwrite?</Dialog.Description>
		<Dialog.Button label="Cancel" onPress={this._handle_dismiss_dialog()}/>
		<Dialog.Button label="Ok" onPress={this._handle_override_account()} />
	</Dialog.Container>
</View>
*/

function parse_URL(url){
	var punyCode_url = punycode.toASCII(url)
	var parse = parseDomain(punyCode_url);
	
	if(parse == null) return false;
	
	if(parse.domain != "" && parse.tld != ""){
		return parse.domain + "." + parse.tld
	}else{ 
		return false;
	}
}
