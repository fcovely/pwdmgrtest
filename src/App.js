import React, {Component, PureComponent} from 'react';
import {View, Text, PanResponder, ViewPropTypes, Image, Toast} from 'react-native';
import PropTypes from 'prop-types';
import {Root} from 'native-base';
import {ListItem} from "react-native-elements";
import Icon from 'react-native-vector-icons/dist/Ionicons';
import Dialog from "react-native-dialog";

import RBSheet from 'react-native-raw-bottom-sheet';
import Spinner from 'react-native-loading-spinner-overlay';
import DeviceInfo from 'react-native-device-info';

//Component
import App_Container from './App_Container'
import Splash from "./Splash";

//Storage API
const StorageAPI = require('./util/Storage.js');
const Storage = new StorageAPI();

export default class App extends Component<{}>{
    constructor(props) {
		super(props)
        this.state = {
			isLoading: true, isActive: true,
			spinner: {visible: false, text: ""},
			curr_device: {id: "", name: "", sn: "", connected: false},
			bottom_sheets_height: 110,
			alert: false
		};

        global.state = this;
		
		global.E_API = null;
		global.reconnect_manager = null;
		global.bottom_sheets_device = null;
		global.navigate = null;
		
		global.credentials_list = [];
		
		global.device_name = "";
		global.device_id = "";
    }

	componentDidMount = async () => {
		this._init_device_info();
		
		const data = await this.performTimeConsumingTask();
        if (data !== null) { 
        	var result = await Storage.get_timer();
        	if(result){
        		this.timeout = (result * 60 * 1000); 
        		this.setState({ isLoading: false });
        	}
        }
    }
    
    componentWillUnmount() {
    
	}
	
    _init_device_info = async () => {
		global.device_name = await DeviceInfo.getDeviceName().then(deviceName => {
            if(deviceName.includes("’")) deviceName = deviceName.replace("’", "'");
            if(deviceName.length === 1) return deviceName + " ";
            return deviceName
        });

        global.device_id = await DeviceInfo.getDeviceId().then(deviceId => {
            return deviceId
        });
	}
	
    performTimeConsumingTask = async () => {
		return new Promise((resolve) =>
			setTimeout(() => { resolve('result') }, 2000)
		);
	};
	
	onAction = (active) => {
		if(active == false){
			this.active = false;
			console.log(false);
			
			clearInterval(this.session_timer);
			this.session_timer = null
			
			Storage.remove_session_pin();
		}else{
			if(this.session_timer == null) this._update_session();
		};
	}
	
	_update_session = () => {
		this.active = true;
		var parent = this;
		this.session_timer = setInterval(function(){ 
			if(parent.active == true){
				Storage.update_session_time();
			}else{
				clearInterval(parent.session_timer);
				parent.session_timer = null
			}
		}, 60000);
	}
	
	_handle_disconnect_device = () => {
		if(global.E_API != null){
    		global.E_API.CardClose(callback = (resultCode) => { })
		}
		
		global.bottom_sheets_device.close();
		global.navigate('Device_Screen');
	}
	
	_handle_reconnect_device = () => {
		global.bottom_sheets_device.close();
		global.reconnect_manager.request_reconnect(this.state.curr_device.id, this.state.curr_device.name, this.state.curr_device.sn, async (done) => {
			this.setState({ 
				spinner: {visible: false, text: ""},
				curr_device: {id: global.E_API.currID, name: global.E_API.currName, sn: global.E_API.currSN, connected: true},
				bottom_sheets_height: 110
			});
		});
	}
	
	_request_cancel_usage = () =>{
    	if(global.E_API != null){
			global.E_API.CardClose(async (resultCode) => {
				if (resultCode === ETH_SUCCESS) {
					global.E_API = null;
				}
			})
		}
		
		this.setState({ spinner: {visible: false, text: ""}, alert: false });
		global.navigate('Device_Screen');
    }
	
    render() {
    	if(this.state.isLoading == true) {
			return <Splash />

		}else{
			return (
				<Root>
					<UserInactivity
						timeForInactivity={this.timeout}
						checkInterval={30000}
						onAction={this.onAction}
					>
						<Spinner
							visible={this.state.spinner.visible}
							textContent={this.state.spinner.text}
							textStyle={{color: '#FFF', fontSize: 16}}
						/>
						<View>
							<Dialog.Container visible={this.state.alert}>
								<Dialog.Title>Error:</Dialog.Title>
								<Dialog.Description>
									Make sure your device is power on, and is authenticated, please try again.
								</Dialog.Description>
								<Dialog.Button label="Dismiss" onPress={() => { this._request_cancel_usage() }} />
							</Dialog.Container>
						</View>
						
						<View>
							<RBSheet ref={ref => {global.bottom_sheets_device = ref;}} height={this.state.bottom_sheets_height} duration={250}>
								<View>
									<ListItem title={this.state.curr_device.name} leftIcon={ <Icon name={'ios-radio-button-on'} color={this.state.curr_device.connected ? "#ADFF2F" : "red"} size={30}/> } bottomDivider/>
									<ListItem style={{display: this.state.curr_device.connected ? "none" : "flex" }} titleStyle={{fontSize: 14}} title="Reconnect device" rightIcon={<Image source={require('./assets/img/bluetooth.png')} style={{width: 15, height: 20, resizeMode: 'contain'}}/>} onPress={()=> this._handle_reconnect_device()}/>
									<ListItem titleStyle={{fontSize: 14}} title={this.state.curr_device.connected ? "Disconnect device" : "Switch device"} rightIcon={<Image source={require('./assets/img/bluetooth_disabled.png')} style={{width: 15, height: 20, resizeMode: 'contain'}}/>} onPress={()=> this._handle_disconnect_device()}/>
								</View>
							</RBSheet>
						</View>	
						
						<App_Container />
					</UserInactivity>
				</Root>
			)
		}
    }
}

class UserInactivity extends PureComponent {
	static propTypes = {
		timeForInactivity: PropTypes.number,
		checkInterval: PropTypes.number,
		children: PropTypes.node.isRequired,
		style: ViewPropTypes.style,
		onAction: PropTypes.func.isRequired,
	};

	static defaultProps = {
		timeForInactivity: 10000,
		checkInterval: 30000,
		style: {
			flex: 1,
		},
	};

	state = {
		active: true,
	};

	UNSAFE_componentWillMount() {
		this.panResponder = PanResponder.create({ 
			onMoveShouldSetPanResponderCapture: this.onMoveShouldSetPanResponderCapture,
			onStartShouldSetPanResponderCapture: this.onMoveShouldSetPanResponderCapture,
			onResponderTerminationRequest: this.handleInactivity
		});
		this.handleInactivity();
	}

	componentWillUnmount() {
		clearInterval(this.inactivityTimer);
	}

	/**
	* This method is called whenever a touch is detected. If no touch is
	* detected after `this.props.timeForInactivity` milliseconds, then
	* `this.state.inactive` turns to true.
	*/
	handleInactivity = () => {
		clearTimeout(this.timeout);
		this.setState({
			active: true,
		}, () => {
			this.props.onAction(this.state.active); // true
		});
		
		this.resetTimeout();
	}

	/**
	* If more than `this.props.timeForInactivity` milliseconds have passed
	* from the latest touch event, then the current state is set to `inactive`
	* and the `this.props.onInactivity` callback is dispatched.
	*/
	timeoutHandler = () => {
		this.setState({
			active: false,
		}, () => {
			this.props.onAction(this.state.active); // false
		});
	}

	resetTimeout = () => {
		this.timeout = setTimeout(this.timeoutHandler, this.props.timeForInactivity);
	}

	onMoveShouldSetPanResponderCapture = () => {
		this.handleInactivity();
		/**
		 * In order not to steal any touches from the children components, this method
		 * must return false.
		 */
		return false;
	}

	render() {
		const {style, children} = this.props;
		return (
			<View style={style} collapsable={false} {...this.panResponder.panHandlers} >
				{children}
			</View>
		);
	}
}

/*
var result = await Storage.get_timer();
if(result){
	this.setState({
		timeout: (result * 60 * 1000)
	})
}

_inactivity_timer = (active) => {
	console.log(new Date());
	if(active == false){
		alert("Timeout");
		Storage.remove_session_pin();
	}
}
    
_reset_inactivity_timer = () => {
	clearTimeout(this.timer)
	if(this.state.timeout)
	this.setState({timeout:false})
	
	this.timer = setTimeout(() => {
		console.log("Timeout...");
	}, 5000)
}

<UserInactivity
	timeForInactivity={this.state.timeout}
	onAction={isActive => { this._inactivity_timer(isActive) }}
>
	<Spinner
		visible={this.state.spinner.visible}
		textContent={this.state.spinner.text}
		textStyle={{color: '#FFF', fontSize: 16}}
	/>
	<App_Container />
</UserInactivity>
*/