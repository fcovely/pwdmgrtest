import React, {Component} from 'react';
import {Alert, View, FlatList} from 'react-native';
import {BallIndicator} from 'react-native-indicators';

var s = require('../util/styles');

// UI
import {Container, Text, Button, Header, Left, Body, Right, Title} from 'native-base';
import { ListItem } from "react-native-elements";
import Icon from 'react-native-vector-icons/dist/Ionicons';

import { NavigationActions } from 'react-navigation'

// EventEmiter
import { EventRegister } from 'react-native-event-listeners'

type Props = {};
export default class Device extends Component<Props> {
	constructor(props) {
		super(props)

		this.state = {
			ui_message: {deleteDeviceMessage: false},
			registered_peripheral: {id: null, name: null},
			device_list: []
		}
	}

	componentDidMount() {
		console.log("TEST2");

		// ===============================================================
        // ======================= EVENT LISTENER ========================
        // ===============================================================
		this.listener = EventRegister.addEventListener('DEVICE_EVENT', (data) => {
        	var rcv_msg = JSON.parse(data);
        	console.log("rcv_msg");
        	console_log(rcv_msg.list);

			switch(rcv_msg.title){
        		case "REPLY_NEARBY_PERIPHERAL":
        			this.setState({
        				device_list: rcv_msg.list
        			});

        			break;

        		case "REPLY_REGISTERED_PERIPHERAL":
        			if(rcv_msg.peripheral.id && rcv_msg.peripheral.name){
        				this.setState({
        					ui_message: {deleteDeviceMessage: true},
        					registered_peripheral: {id: rcv_msg.peripheral.id, name:rcv_msg.peripheral.name}
        				})
        			}else{
        				this.setState({
        					ui_message: {deleteDeviceMessage: false},
        					registered_peripheral: {id: null, name: null}
        				})
        			}
        			break;

        		default:
        		break;
        	}
        })

		// ===============================================================
        // ==================== FOCUS/BLUR LISTENER ======================
        // ===============================================================
		const { navigation } = this.props;
		this.focus_listener = navigation.addListener('didFocus', () => {
			global.device_page = true;

			this._get_nearby_device();
			this._get_registered_device();
		});

		this.focus_listener = navigation.addListener('willBlur', () => {
			global.device_page = false;

			this.setState({ device_list: [] })
		});
	}

	componentWillUnmount() {
        EventRegister.removeEventListener(this.listener);
        this.focus_listener.remove();
    }

	_get_nearby_device = () => {
		var msg = {title: "REQUEST_NEARBY_PERIPHERAL", from: "DEVICE"};
		EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
	}

	_get_registered_device = () => {
		var msg = {title: "REQUEST_REGISTERED_PERIPHERAL", from: "DEVICE"};
		EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
	}

	_handle_alert_delete_registered_peripheral = () => {
		Alert.alert(
			`Delete ${this.state.registered_peripheral.name}`, 'Are you sure you wish to delete device?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{text: 'Delete', onPress: () => this._handle_confirm_delete_registered_peripheral()},
			],
				{cancelable: false},
		);
	}

	_handle_confirm_delete_registered_peripheral = () => {
		var msg = {title: "REQUEST_DELETE_REGISTERED_DEVICE", from: "DEVICE"};
		EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
		this.props.navigation.navigate("Vault");
	}

	_register_device = (item) => {
		if(this.state.ui_message.deleteDeviceMessage){
			Alert.alert(
			`Register ${item.name}`, 'Are you sure you wish to register new device?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{	text: 'Connect', onPress: () => this._approve_register_device(item)},
			],
				{cancelable: false},
			);

		}else{
			this._approve_register_device(item);
		}
	}

	_approve_register_device = (item) => {
		var msg = { title: 'REQUEST_CONNECT_DEVICE', from: "DEVICE", peripheral:{id: item.id, name: item.name}};
		EventRegister.emit('BLE_EVENT', JSON.stringify(msg));
		EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));
		//this.props.navigation.navigate("Vault")
	}

	render() {
		const backAction = NavigationActions.back({
			key: null
		})

		return (
			<Container>
				<Header>
					<Left><Button iconLeft transparent light onPress={() => { this.props.navigation.dispatch(backAction); }} ><Icon name='ios-arrow-back' size={25} color="black" /></Button></Left>
					<Body><Title>Ethernom, Inc.</Title></Body>
					<Right></Right>
				</Header>

				<View style={[s.container_header_title, s.bg_black, {display: this.state.ui_message.deleteDeviceMessage ? 'flex' : 'none'}]}>
					<View style={{width:'100%'}}>
						<Text style={{marginTop:15, marginLeft: 10, color: 'white'}}>
							Registered device:
						</Text>
					</View>
				</View>

				<View style={[s.items, {display: this.state.ui_message.deleteDeviceMessage ? 'flex' : 'none', flexDirection: 'row', alignItems: 'stretch'}]}>
					<View style={{width:'85%'}}>
						<Text style={{marginTop:15, marginLeft: 10}}>
							Name: {this.state.registered_peripheral.name + "\n"}
							<Text style={{fontSize: 10}}>ID: {this.state.registered_peripheral.id + "\n"}</Text>
						</Text>
					</View>
					<Button transparent block style={{width:'15%', height: '100%'}} onPress={() => { this._handle_alert_delete_registered_peripheral() }} >
						<Icon name='ios-remove-circle' size={25} color="red"/>
					</Button>
				</View>

				<View style={[s.container_header_title, s.bg_black]}>
					<View style={{width:'85%'}}>
						<Text style={{marginTop:15, marginLeft: 10, color: 'white'}}>
							Scanning for nearby devices...
						</Text>
					</View>
					{/*<Button transparent style={{width:'15%', height: '100%'}} >*/}
						{/*<ActivityIndicator size="small" color="white" />*/}
					{/*</Button>*/}
                    <BallIndicator color='white' size={20} />
				</View>

				<View style={[s.container_list2]}>
					<FlatList
						data= {this.state.device_list}
						renderItem={({ item }) => (
							<ListItem button onPress={() => {this._register_device(item)}}
								title={item.name}
								subtitle={item.id}
								rightIcon = {{name: 'add'}}
								bottomDivider
							/>
						)}
					/>
				</View>
			</Container>
		);
	}
}

function console_log(string){
	console.log("Device page: " + string);
}
