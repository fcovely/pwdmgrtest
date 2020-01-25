// ===============================================================
// ====================== IMPORT LIB =============================
// ===============================================================

// React Component
import React, {Component} from 'react';
import {View, FlatList, Clipboard, Keyboard} from 'react-native';
var s = require('../util/styles');

// UI
import {Container, Text,Button, Header, Left, Body, Right, Title, Card, CardItem, Toast, Input,InputGroup} from 'native-base';
import { ListItem } from "react-native-elements";
import Icon from 'react-native-vector-icons/dist/Ionicons';
import BottomSheet from 'react-native-js-bottom-sheet'

// EventEmiter
import { EventRegister } from 'react-native-event-listeners'

// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================


export const loading = require('../../assets/loading.gif');

export default class Vault extends Component {
	constructor(props) {
		super(props)

		this.state = {
			ui_message: {addDeviceMessage: false, scanMessage: true, rescanMessage: false, foundMessage: false, connectingMessage: false, connectedMessage: false},
			peripheral: {id: null, name: null, connected: false},
			item_list: [],data: [],username: '', url: '',password: '', name: '', account: [], isAddAccount: false,
			code : "",value: "", isSearch: false
		}
	}
	bottomSheet: BottomSheet;

	componentDidMount() {
		this.listener = EventRegister.addEventListener('VAULT_EVENT', (data) => {
        	var rcv_msg = JSON.parse(data);
        	console.log(rcv_msg);

        	switch(rcv_msg.title){
        		/*
				case "READY":
        			var msg = {title: "REQUEST_REGISTERED_PERIPHERAL", from: "VAULT"};
					EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
        			break;
				*/

        		case "REQUEST_CONNECT_DEVICE":
        			this.setState({
						peripheral: {id: rcv_msg.peripheral.id, name:rcv_msg.peripheral.name, connected: false}
					})
        			break;

        		case "REPLY_REGISTERED_PERIPHERAL":
					/*
					if(this.state.peripheral.connected == false){
						if(rcv_msg.peripheral.id && rcv_msg.peripheral.name){
							this.setState({
								peripheral: {id: rcv_msg.peripheral.id, name:rcv_msg.peripheral.name, connected: false}
							});
							if(rcv_msg.connecting == false) this.update_ui_states(1);
						}else{
							this.setState({
								peripheral: {id: null, name: null, connected: false}
							});
							this.update_ui_states(0);
						}
					}
					*/
                    break;

				case "REPLY_BLE_FOUND_REGISTERED_PERIPHERAL":
					this.update_ui_states(2);
					break;

				case "REPLY_BLE_CONNECTING_PERIPHERAL":
					this.props.navigation.navigate("Vault");
					this.setState({
						code: rcv_msg.data
					});
					this.update_ui_states(3);
					break;

				case "REPLY_BLE_CONNECTED_PERIPHERAL":
					this.setState({
						peripheral: {id: this.state.peripheral.id, name: this.state.peripheral.name, connected: true}
					})
					this.update_ui_states(4);
					break;

				case "REPLY_BLE_DISCONNECTED_PERIPHERAL":
					this.setState({
						peripheral: {id: this.state.peripheral.id, name: this.state.peripheral.name, connected: false}
					});

					//TO-DO
					var msg = {title: "REQUEST_REGISTERED_PERIPHERAL", from: "VAULT"};
					EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
					break;

				case "REPLY_ITEM_LIST":
					this.setState({
						item_list: rcv_msg.list,data: rcv_msg.list
					});
					break;

				case "REQUEST_ADD_ACCOUNT":
					var data = rcv_msg.data;
					var item_list = this.state.item_list;
					if(item_list.length){
						for(var i=0; i<item_list.length; i++){
							if(item_list[i].url == data.url && item_list[i].username == data.username && item_list[i].password == data.password){
								console.log("already exist");
								return;
							}else if(item_list[i].url == data.url && item_list[i].username == data.username && item_list[i].password != data.password){
								console.log("already exist, but password change");
								return;
							}
						}
					}

					var msg = { title: 'REQUEST_GENERATE_PACKET', from: "VAULT", payload:{cmd: "ADD_ACCOUNT", data: {url: data.url, username: data.username, password: data.password, name: data.name}}};
					EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
					console.log("add account!");

					break;

				case "REQUEST_EDIT_ACCOUNT":
					var data = rcv_msg.data;
					var msg = { title: 'REQUEST_GENERATE_PACKET', from: "VAULT", payload:{cmd: "EDIT_ACCOUNT", data: {index: data.index, url: data.url, username: data.username, password: data.password, name: data.name}}};
					EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
					console.log("edit account!");
					break;

        		default:
					break;
        	}
        })

		const { navigation } = this.props;
		this.focus_listener = navigation.addListener('didFocus', () => {
			global.vault_page = true;
		});

		this.focus_listener = navigation.addListener('willBlur', () => {
			global.vault_page = false;
		});

		this._init_vault();
	}

	componentWillUnmount() {
        EventRegister.removeEventListener(this.listener);
        this.focus_listener.remove();
    }

	_init_vault = () => {
		var msg = {title: "PAGE_READY", from: "VAULT"};
		EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
	}

	//Update Message states
	update_ui_states = cases => {
		switch(cases){
			//No registered device Message
			case 0:
				this.setState({
					ui_message: {addDeviceMessage: true, scanMessage: false, rescanMessage: false, foundMessage: false, connectingMessage: false, connectedMessage: false,isAddAccount: false},
					item_list: [],
					code: ""
				});
				break;

			//Scan Message
			case 1:
				this.setState({
					ui_message: {addDeviceMessage: false, scanMessage: true, rescanMessage: false, foundMessage: false, connectingMessage: false, connectedMessage: false,isAddAccount: false},
					item_list: [],
					code: ""
				});
				break;

			//Found Message
			case 2:
				this.setState({
					ui_message: {addDeviceMessage: false, scanMessage: false, rescanMessage: false, foundMessage: true, connectingMessage: false, connectedMessage: false,isAddAccount: false},
					item_list: [],
					code: ""
				});
				break;

			//Connecting Message
			case 3:
				this.setState({
					ui_message: {addDeviceMessage: false, scanMessage: false, rescanMessage: false, foundMessage: false, connectingMessage: true, connectedMessage: false,isAddAccount: false},
					item_list: [],
					code: this.state.code
				});
				break;

			//Connected Message
			case 4:
				this.setState({
					ui_message: {addDeviceMessage: false, scanMessage: false, rescanMessage: false, foundMessage: false, connectingMessage: false, connectedMessage: true,isAddAccount: true},
					item_list: this.state.item_list,
					code: ""
				});
			break;

			default:
				break;
		}
	}

	_handle_navigate_view_account = (item) =>{
		this.bottomSheet.close();
        this.props.navigation.navigate("View_Account", {
            key: item.key,
            url: item.url,
            username: item.username,
            password: item.password
        });
	}

	_handle_navigate_edit_account = (item) =>{
		var name_list = [];
		for(var i=0; i<this.state.item_list.length;i++){
			if(item.key == this.state.item_list[i].key && item.url == this.state.item_list[i].url && item.username == this.state.item_list[i].username && item.password == this.state.item_list[i].password){
				count = i;
			}else{
				name_list.push(this.state.item_list[i].key);
			}
		}
        this.bottomSheet.close();
		this.props.navigation.navigate("Edit_Account", {
			index: count,
			key: item.key,
			url: item.url,
			username: item.username,
			password: item.password,
			names: name_list
		});
	}

	_handle_navigate_add_staging = (item) => {
		const { navigate } = this.props.navigation;
		var url_list = [];
		var name_list = [];
		for(var i=0; i<item.length; i++){
			url_list.push(item[i].url);
			name_list.push(item[i].key);
		};

		navigate("Add_Staging", { urls: url_list, names: name_list});
    };

	_handle_open_bottom_sheet = (item) => {
        this.bottomSheet.open();
        this.setState({ username: item.username , url: item.url, account: item, password: item.password, name: item.key});
    };

    _handle_copy_password = async (password, name) => {
        await Clipboard.setString(password);
        this.bottomSheet.close();
        Toast.show({text: 'Copied ' + name + '\'s password', type: 'success'})
    };

    _handle_copy_username = async (username, name) => {
        await Clipboard.setString(username);
        this.bottomSheet.close();
        Toast.show({text: 'Copied ' + name + '\'s username', type: 'success'});
    };

	_handle_delete_account = (item) => {
		var msg = { title: 'REQUEST_GENERATE_PACKET', from: "VAULT", payload:{cmd: "DELETE_ACCOUNT", data: {url: item.url, username: item.username, password: item.password, name: item.key}}};
		EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
		console.log("delete account!");
		this.bottomSheet.close();
	}

    onSearchFilterText = (text) => {
        const newData = this.state.data.filter(item => {
			console.log(item);
            const name 		= `${item.key.toLowerCase()}`;
			const username 	= `${item.username.toLowerCase()}`;
			const textData 	= text.toLowerCase();

			if(name.includes(textData) || username.includes(textData))
				return true;
			else
				return false
        });

        this.setState({
            value: text, item_list: newData, isSearch: true
        });

        if (text === "") {
            this.setState({
                item_list: this.state.data
            })
        }
    };

    handleClearText = () =>{
        this.setState({value: "", item_list: this.state.data, isSearch: false});
        Keyboard.dismiss()
    };


	render() {
		return (
			<Container>
				<Header>
					<Left></Left>
					<Body><Title>Ethernom, Inc</Title></Body>
					<Right></Right>

				</Header>

        		<View style={[s.container]}>
					<View style={[s.items, {display: this.state.ui_message.addDeviceMessage ? 'flex' : 'none'}]}>
						<Text style={{fontSize: 100, textAlign: 'center'}}>:(</Text>
						<Text style={{marginTop:10, textAlign: 'center'}}>
							No registered device...
						</Text>
                        <Button block iconLeft style={{marginTop:10, backgroundColor: '#1565C0'}} onPress={() => { this.props.navigation.navigate("Device"); }} >
                            <Icon name='ios-add' size={25} color="white"/>
                            <Text>Add device</Text>
                        </Button>
					</View>

					<View style={[s.items,{display: this.state.ui_message.scanMessage ? 'flex' : 'none'}]}>
						<View style={{width: "100%", height: 140}}>
                            <Text style={{marginTop:10, textAlign: 'center', flex: 1}}>
                                Scanning for Ethernom's Device{"\n"}
                                Name: {this.state.peripheral.name + "\n"}
                            </Text>
						</View>



					</View>

					<View style={[s.items, {display: this.state.ui_message.rescanMessage ? 'flex' : 'none' }]}>
						<Icon name='ios-warning' size={100} color="#e6b05f" style={{alignSelf:'center'}}/>
						<Text style={{marginBottom:10}}>Unable to locate Ethernom's Card...</Text>
						<Button block iconLeft warning style={{marginTop:5}} onPress={() => { this.update_ui_states(1) }} >
							<Icon name='ios-refresh' size={25} color="white"/>
							<Text>Restart BLE Scan</Text>
						</Button>
					</View>

					<View style={[s.items, {display: this.state.ui_message.foundMessage ? 'flex' : 'none'}]}>
						<Icon name='ios-help-circle' size={80} color='#73b666' style={{alignSelf:'center'}}/>
                        <Text style={{textAlign: 'center'}}>
							Found Ethernom's Card:
								<Text style={{fontWeight: 'bold'}}> {}</Text>
							{"\n"}
							Confirm Connect to Ethernom's Device
						</Text>

						<View style={{marginTop:15}}>
							<Button block iconLeft success onPress={() => {this._connect_card()}}>
								<Icon name='ios-checkmark-circle' size={25} color="white"/>
								<Text>Connect</Text>
							</Button>
							<Button block iconLeft danger style={{marginTop:15}} onPress={() => { this.update_ui_states(1); }}>
								<Icon name='ios-close-circle' size={25} color="white"/>
								<Text>Cancel</Text>
							</Button>
						</View>
					</View>


					<View style={[s.items, {display: this.state.ui_message.connectingMessage ? 'flex' : 'none'}]}>

                        <View style={{width: "100%", height: 240}}>

                            <Text style={{marginTop:10, textAlign: 'center', paddingTop: 10}}>
                                Connecting Ethernom's Device{"\n"}
                                Name: {this.state.peripheral.name + "\n"}
                            </Text>
                            <Card>
                                <CardItem>
                                    <Body>
                                    <Text style={{marginTop:10, textAlign: 'left'}}>
                                        Device's name: <Text style={{fontWeight: 'bold'}}>{"\n" + global.device_name + "\n\n"}</Text>
                                        Confirmation code: <Text style={{fontWeight: 'bold'}}>{"\n" + this.state.code + "\n"}</Text>
                                    </Text>
                                    </Body>
                                </CardItem>
                            </Card>
						</View>

					</View>


					<View style={[s.container_list, {display: this.state.ui_message.connectedMessage ? 'flex' : 'none'}]}>
                        <View searchBar style={{flexDirection: 'row', padding:10,backgroundColor: '#1565C0',display: this.state.ui_message.connectedMessage ? 'flex' : 'none'}}>

                            <InputGroup rounded style={{flex:1, backgroundColor:'#fff',height:32, paddingLeft:10, paddingRight:10}}>
                                <Icon name="ios-search"/>
                                <Input placeholder="Search"  style={{paddingBottom: 4}}  onChangeText={(text) => this.onSearchFilterText(text)}
                                       autoCorrect={false} value={this.state.value} returnKeyType={'done'} clearButtonMode={'always'}/>
                            </InputGroup>

                            <Button transparent style={{height:30, display: this.state.isSearch ? 'flex': 'none'}} onPress={() => this.handleClearText()}>
                                <Text style={{color: 'white'}}>Cancel</Text>
                            </Button>

                        </View>

						<Button full style={[{display: this.state.ui_message.connectedMessage ? 'flex' : 'none', backgroundColor: 'white', marginTop: 1, borderBottomColor: 'lightgray', borderBottomWidth: 1}, s.container_header_title]}
                                onPress={() => this._handle_navigate_add_staging(this.state.item_list)}>
                            <View style={{width:'85%'}}>
                                <Text style={{marginTop:15, marginLeft: -15, color:"black"}}>
									Add Account
								</Text>
                            </View>
                            <View style={{marginTop: 10,width:25, height: 25, backgroundColor: 'white', justifyContent:'center', alignItems: 'center'}}>
								<Icon name='ios-add' size={25} color="black" style={{marginTop: 1, marginLeft: 1}}/>
							</View>
                        </Button>

						<FlatList
							data= {this.state.item_list}
							renderItem={({ item }) => (
								<ListItem
									title={item.key}
									subtitle={item.username}
                                    onPress={() => {this._handle_open_bottom_sheet(item)}}
									rightIcon = {{
										name:'ios-key',
										type: 'ionicon',
										color:'#1565C0',
										size:25,
										iconStyle:{padding: 10},
										onPress: () => this._handle_copy_password(this.state.password, item.key)
									}}
									bottomDivider
								/>
							)}
						/>

                        <BottomSheet ref={(ref: BottomSheet) => {this.bottomSheet = ref}}
							itemDivider={1}
							backButtonEnabled={true}
							coverScreen={true}
							title= 'Create'
							height={330}
							options={[
								{
								 title: this.state.name,
								 icon: (<Icon name='ios-information-circle-outline' size={20} color='#1565C0'/>),
								 onPress: () => null
								},
                                {
                                    title: 'Copy Username',
                                    icon: (<Icon name='ios-contact' size={20} color='#1565C0'/>),
                                    onPress: () => this._handle_copy_username(this.state.username, this.state.name)
                                },
                                {
                                    title: 'Copy Password',
                                    icon: (<Icon name='ios-key' size={20} color='#1565C0'/>),
                                    onPress: () => this._handle_copy_password(this.state.password, this.state.name)
                                },
								{
								 title: 'View Account',
								 icon: (<Icon name='ios-eye' size={20} color='#1565C0'/>),
								 onPress: () => this._handle_navigate_view_account(this.state.account)
								},
								{
								 title: 'Edit Account',
								 icon: (<Icon name='ios-settings' size={20} color='#1565C0'/>),
								 onPress: () => this._handle_navigate_edit_account(this.state.account)
								},
								{
								 title: 'Delete Account',
								 icon: (<Icon name='ios-remove-circle' size={20} color='#1565C0'/>),
								 onPress: () => this._handle_delete_account(this.state.account)
								},
							]}
							isOpen={false}
                        />


					</View>
				</View>
			</Container>
		);
	}
}

/*
<View style={[s.items, {top: '45%', display: this.state.ui_message.retrieveMessage ? 'flex' : 'none'}]}>
<ActivityIndicator size="large" color="#73b666" />
<Text style={{marginTop:10, textAlign: 'center'}}>
Retrieving data from Ethernom's Device...
</Text>
</View>
*/

// ===============================================================
// ============== Console.log =================
// ===============================================================
function console_log(string){
	console.log("Vault page: " + string);
}
