import React, {Component} from 'react';
import {View, Image, ImageBackground, StatusBar, Dimensions} from 'react-native';
import {Content, Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Input, Label, Footer} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import { EventRegister } from 'react-native-event-listeners';

var s = require('../css/styles');
const screenWidth = Math.round(Dimensions.get('window').width);

//ETHERNOM API;
import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr";
var PSD_MGR_API = new PSD_MGR();

type Props = {};
export default class View_Account extends Component<Props> {
    constructor(props) {
        super(props);

        const { navigation } = this.props;
        this.state = {
            name: navigation.getParam('name', ""),
            url: navigation.getParam('url', ""),
            username: navigation.getParam('username', ""),
            password: "",
			hidden: true,
			connected: global.state.state.curr_device.connected
        }
    }
    
    componentDidMount() {
     	this._init_password();
     	this._subsribe_device_status_listener();
     	this._focus_listener();
    }
    
    componentWillUnmount() {
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
    
    _init_password = () => {
    	var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(this.state.url, this.state.username);
        var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
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
					spinner: {visible: false, text: ""},
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
                	this.setState({ password: msg.password });
                	global.state.setState({ spinner: {visible: false, text: ""} });
                }
                break;
			
			default:
				break;
		};
    };
    
     /*
	============================================================================================================
	========================================= NAVIGATE =========================================================
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
        return (
            <Container>
				<Header style={{backgroundColor: "#cba830"}}>
					<StatusBar backgroundColor='#d7b43e' barStyle="light-content"/>
					<Left style={{flex: 3, marginLeft: 8}}><Button onPress={() => {this._handle_navigate_vault();}} transparent><Text style={{color: 'black'}}>Back</Text></Button></Left>
					<Body style={{flex: 3}}><Title style={{color: 'black'}}>Vault</Title></Body>
					<Right style={{flex: 3}}></Right>
				</Header>
				
				<View style={[s.container]}>
					<View style={[s.container_list,{backgroundColor: 'white'}]}>
						<Button onPress={() => this._handle_open_bottom_sheets_device()} full style={[s.eth_btn_full, s.bg_black, {backgroundColor: 'black', height: 60}]} >
							<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
								<Icon name={'ios-radio-button-on'} color={this.state.connected ? "#ADFF2F" : "red"} style={{marginLeft: 15}} size={30}/>
								<Text style={{color: 'white', fontWeight: 'bold'}}>{global.state.state.curr_device.name}</Text>
								<Icon style={{marginRight: 18, position: 'absolute', right: 0}} name={'ios-settings'} color="white" size={20}/>
							</View>
						</Button>
						
						<View style={[s.container_header_title,{justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE'}]}>
							<Text style={{marginTop:5}}>View account</Text>
						</View>
						
						<Content>
							<Form>
								<Item stackedLabel>
									<Label style={{fontSize: 12}}>Display name:</Label>
									<Input style={{fontSize: 15}} maxLength={31} autoCorrect={false} value={this.state.name} editable={false}/>
								</Item>
				
								<Item stackedLabel>
									<Label style={{fontSize: 12}}>URL:</Label>
									<Input style={{fontSize: 15}} maxLength={127} autoCapitalize="none" autoCorrect={false} value={this.state.url} editable={false}/>
								</Item>
				
								<Item stackedLabel>
									<Label style={{fontSize: 12}}>Username:</Label>
									<Input style={{fontSize: 15}} maxLength={63} autoCapitalize="none" autoCorrect={false} value={this.state.username} editable={false}/>
								</Item>
				
								<Item stackedLabel last>
									<Label style={{fontSize: 12}}>Password:</Label>
									<View style={{flex: 1, flexDirection: 'row'}}>
										<Input style={{width: '60%', fontSize: 15}} maxLength={63} autoCapitalize="none" autoCorrect={false} secureTextEntry={this.state.hidden}
												value={this.state.password} editable={false}
										/>
										<Button style={{width: 30, marginTop: 0, marginRight: 15}} onPress={() => this._handle_hide_show()} transparent>
											<Icon name= { this.state.hidden ? 'ios-eye' : 'ios-eye-off'} size={25} color="#cba830"/>
										</Button>
									</View>
								</Item>
							</Form>
						</Content>
					</View>
				</View>
            </Container>
        );
    }
}

/*
<Footer>
	<Button full style={[{backgroundColor: '#cba830'}, s.container_header_title]}
		onPress={() => {this.props.navigation.navigate("Vault_Screen");}}>
		<View style={{width: "10%",justifyContent: 'center', alignItems: 'center'}}>
			<Icon name='ios-arrow-back' size={25} color="black" style={{justifyContent: 'center',alignItems: 'center'}}/>
		</View>
		<View style={{width: "90%",justifyContent:'center', alignItems: 'center'}}>
			<Text style={{color: 'black', textAlign:'center', marginRight: screenWidth*(10/100)}}>Back</Text>
		</View>
	</Button>
</Footer>
*/
