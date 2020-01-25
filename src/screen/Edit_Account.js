import React, {Component} from 'react';
import {View, Image, StatusBar, ScrollView, Keyboard} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Input, Label, Footer, Toast} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import KeyboardStickyView from 'rn-keyboard-sticky-view';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import Dialog from "react-native-dialog";
import { EventRegister } from 'react-native-event-listeners';

var s = require('../css/styles');

//ETHERNOM API;
import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
var PSD_MGR_API = new PSD_MGR();

const parseDomain = require("parse-domain");
const punycode = require('punycode');

type Props = {};
export default class Edit_Account extends Component<Props> {
    curr_credential = null;
    curr_credentials_list = [];
    
    constructor(props) {
        super(props);

        const { navigation } = this.props;
        this.state = {
        	name: navigation.getParam('name', ""),
            url: navigation.getParam('url', ""),
            username: navigation.getParam('username', ""),
            password: "",
            hidden: true,
            isEditable: false,
            alert: false,
            error_text: "",
            connected: global.state.state.curr_device.connected
        }
    }

    componentDidMount(){
    	this._init_password();
    	this._subsribe_device_status_listener();
    	this._focus_listener();
    }
    
    componentWillUnmount(){
    	EventRegister.removeEventListener(this.device_status_listener);
    	if(this.did_focus_screen != null) this.did_focus_screen.remove();
    }
    
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

    _handle_hide_show = () => {
    	this.setState({
            hidden: !this.state.hidden
        })
    }
    
    _handle_edit_account = () => {
        Keyboard.dismiss();
        
        var result = parse_URL(this.state.url)
    	if(result == false){
    		var parent = this;
			setTimeout(function () {
				parent.setState({
					alert: true,
					error_text: 'Invalid URL, try again with a valid URL.'
				})
			}, 300);
    		return;
    	}
    	
    	this.official_url = result;
        
        for(var i = 0; i<this.curr_credentials_list.length; i++){
			if(this.state.name == this.curr_credentials_list[i].key && this.curr_credentials_list[i].url.includes(this.official_url) && this.state.username == this.curr_credentials_list[i].username){
				var parent = this;
				setTimeout(function () {
					parent.setState({
						alert: true,
						error_text: 'Account already exist, try again with a different sets of credentials.'
					})
				}, 300);
				return;
			}
		}
        
        this._validate_duplicate_name();
    };
    
    _validate_duplicate_name = () => {
    	for(var i = 0; i<this.curr_credentials_list.length; i++){
			if(this.state.name == this.curr_credentials_list.key){
				var parent = this;
				setTimeout(function () {
					parent.setState({
						alert: true,
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
    		this._delete_credential();
    	
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
    
    _handle_dismiss_dialog = () => {
        this.setState({ alert: false, error_text: ""})
    };
    
    /*
	============================================================================================================
	====================================== E_API PROTOCOL ======================================================
	============================================================================================================
	*/
    _init_password = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.state.url, this.state.username);
        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
        
        console.log(out_msg);
        console.log(in_msg);
        
        this._write_card(out_msg, in_msg);
    }
    
    _delete_credential = () => {
    	global.state.setState({ spinner: {visible: true, text: "Loading: Editing account..."} });
    
    	var out_msg = PSD_MGR_API.outMsg_request_deleteAccount(this.curr_credential.url, this.curr_credential.username);
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		this._write_card(out_msg, in_msg);
    }
    
    _edit_credential = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_editAccount(this.official_url, this.state.username, this.state.password, this.state.name);
		var in_msg = PSD_MGR_API.inMsg_reply_generic();
		this._write_card(out_msg, in_msg);
    }
    
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
				global.state.setState({ 
					spinner: {visible: true, text: "Loading: Editing account..."},
					curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true},
					bottom_sheets_height: 110
				});
				
				this._write_card(out_msg, in_msg);
			});
        }
    };
    
    _process_reply_command = (msg) => {
		switch (msg.command) {
			case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
				if (msg.response === PSD_MGR_API.AWK) {
					this.setState({ isEditable: false, password: msg.password })
					this.curr_credential = {name: this.state.name, url: this.state.url, username: this.state.username, password: msg.password};
					
					for(var i =0; i<global.credentials_list.length; i++){
						if(this.state.name != global.credentials_list[i].key && this.state.url != global.credentials_list[i].url && this.state.username != global.credentials_list[i].username){
							this.curr_credentials_list = this.curr_credentials_list.concat(global.credentials_list[i]);
						}
					}
					
					global.state.setState({ spinner: {visible: false, text: ""} });
				}
				break;

			case PSD_MGR_API.C2H_RPLY_EDIT_ACCOUNT:
				if (msg.response === PSD_MGR_API.AWK) {
					console.log("edit successfull");
					
					var obj = [{key: this.state.name, url: this.state.url, username: this.state.username}];
                    global.credentials_list = obj.concat(this.curr_credentials_list);
                    
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
							alert: true,
            				error_text: 'Edit account fails, try again.'
            			})
					}, 300);
				}
				break;

			case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT:
				if (msg.response === PSD_MGR_API.AWK) {
					console.log("delete successfull");
					this._edit_credential();
					
				}else{
					console.log("can't delete account");
					global.state.setState({ spinner: {visible: false, text: ""} });
                    var parent = this;
					setTimeout(function () {
						parent.setState({
							alert: true,
            				error_text: 'Delete account fails, try again.'
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

		if(this.state.name == this.curr_credential.name && this.state.username == this.curr_credential.username && this.state.url == this.curr_credential.url && this.state.password == this.curr_credential.password){
			this.setState({isEditable: false});
		}else{
			this.handleOnChange();
		}
    };
    
    handleOnChange = () => {
    	this.setState({isEditable: false});
    	if(this.state.name !== "" && this.state.url !== "" && this.state.username !== "" && this.state.password !== ""){
            if(this.state.name.trim().length <= 0 || this.state.url.trim().length <= 0 || this.state.username.trim().length <= 0 || this.state.password.trim().length <= 1){
                this.setState({isEditable: false});
            } else {
                this.setState({isEditable: true});
            }
        } else {
            this.setState({isEditable: false});
        }
    };
    
    isASCII = (str) => {
    	return /^[\x00-\x7F]*$/.test(str);
    };
	
	/*
	============================================================================================================
	========================================== RENDER ==========================================================
	============================================================================================================
	*/
	_handle_navigate_vault = () => {
		const { navigate } = this.props.navigation;
		navigate("Vault_Screen");
	}
	
	_handle_open_bottom_sheets_device = () => {
    	global.bottom_sheets_device.open();
    }
	
    render() {
    	console.log(global.state.state.curr_device.connected);
    	
        return (
            <Container>
				<View>
					<Dialog.Container visible={this.state.alert}>
						<Dialog.Title>Error!</Dialog.Title>
						<Dialog.Description>{this.state.error_text}</Dialog.Description>
						<Dialog.Button label="Ok" onPress={() => { this._handle_dismiss_dialog(); }}/>
					</Dialog.Container>
				</View>
				
                <Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor='#d7b43e' barStyle="light-content"/>
                    <Left style={{flex: 3, marginLeft: 8}}><Button onPress={() => {this._handle_navigate_vault();}} transparent><Text style={{color: 'black'}}>Back</Text></Button></Left>
					<Body style={{flex: 4}}><Title style={{color:'black'}}>Vault</Title></Body>
					<Right style={{flex: 3}}><Button onPress={() => {this._handle_edit_account();}} disabled={!this.state.isEditable} transparent><Text style={{color: !this.state.isEditable ? '#ccc' : 'black'}}>Save</Text></Button></Right>
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
						
						<View style={[s.container_header_title,{justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE'}]}>
							<Text style={{marginTop:5}}>Edit account</Text>
						</View>

						<KeyboardAwareScrollView extraScrollHeight={55}>
							<ScrollView style={{marginBottom: 55}}>
								<Form>
									<Item stackedLabel>
										<Label style={{fontSize: 12}}>Display name:</Label>
										<Input onChangeText={(text) => this._handle_text_change(text, 'name')} keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} style={{fontSize: 15}} maxLength={31} autoCorrect={false} value={this.state.name}/>
									</Item>
									
									<Item stackedLabel>
										<Label style={{fontSize: 12}}>URL:</Label>
										<Input onChangeText={(text) => this._handle_text_change(text, 'url')} keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} style={{fontSize: 15}} maxLength={94} autoCapitalize="none" autoCorrect={false} value={this.state.url}/>
									</Item>
				
									<Item stackedLabel>
										<Label style={{fontSize: 12}}>Username:</Label>
										<Input onChangeText={(text) => this._handle_text_change(text, 'username')} keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} style={{fontSize: 15}} keyboardType={'email-address'} maxLength={63} autoCapitalize="none" autoCorrect={false} value={this.state.username}/>
									</Item>
									
									<Item stackedLabel last>
										<Label style={{fontSize: 12}}>Password:</Label>
										<View style={{flex: 1, flexDirection: 'row'}}>
											<Input onChangeText={(text) => this._handle_text_change(text, 'password')} keyboardType={Platform.OS === 'android' ? 'email-address' : 'ascii-capable'} style={{width: '60%',fontSize: 15}}  maxLength={63} autoCapitalize="none" autoCorrect={false} secureTextEntry={this.state.hidden} value={this.state.password}/>
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

/*
<KeyboardStickyView>
	<Footer style={{flexDirection: 'row', backgroundColor: 'white'}}>
		<Button transparent full style={{flexDirection: "row", backgroundColor: '#cba830', width: '50%', height:55, marginEnd: 0.5, borderRadius: 0}}
			onPress={() => {this._reset_state(); this.props.navigation.navigate("Vault_Screen");}}>
			<Icon  reverse  name='ios-arrow-back'  type='ionicon'  color='black' size={20} />
			<Text style={{fontSize: 15,color: 'black'}}>Back</Text>
		</Button>

		<Button transparent full style={{flexDirection: "row",  backgroundColor: this.state.isEditable ? '#cba830' : '#9E9E9E', width: '50%', height:55, borderRadius: 0}}
			onPress={() => { this._handle_edit_account(); }}
			disabled={!this.state.isEditable}>
			<Text style={{fontSize: 15, color: 'black'}}>Save</Text>
			<Icon  reverse  name='ios-construct' type='ionicon' color='black' size={20} style={{marginRight: 2}}/>
		</Button>
	</Footer>
</KeyboardStickyView>
*/