import React, {Component} from 'react';
import {View, Image, FlatList, StatusBar} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Form, Item, Picker, Content} from 'native-base';
import {Icon} from 'react-native-elements';
import {ListItem} from "react-native-elements";

//import * as Keychain from "react-native-keychain";
var s = require('../css/styles');

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

export default class Settings extends Component {
    constructor(props) {
        super(props);
        this.state = {
        	pin_len_selected: undefined,
        	timer_selected: undefined
        }
    }
    
    componentDidMount = async () => {
		var len = await Storage.get_pin_len();
		var time = await Storage.get_timer();
		if(len && time){
    		this.setState({ 
    			pin_len_selected: len.toString(),
    			timer_selected: time.toString()
    		})
    	}
    }

    componentWillUnmount(){

    }
    
    _handle_back = () => {
    	if(global.E_API != null){
    		this.props.navigation.navigate("Vault_Screen");
    	}else{
    		this.props.navigation.navigate("Device_Screen");
    	}
    }

    _handle_navigate_autofill = () => {
    	const {navigate} = this.props.navigation;
		this.props.navigation.navigate("Autofill_Screen", {from: 'SETTINGS'});
    }
    
    on_pin_length_change = async (value: string) => {
		this.setState({ pin_len_selected: value });
		await Storage.save_pin_len(value);
	}

	on_inactivity_timer_change = async (value: string) => {
		this.setState({ timer_selected: value });
		await Storage.save_timer(value);
		
		global.state.setState({
			timeout: parseInt(value)
		})
	}

    render() {
        return (
            <Container>
                <Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor='#d7b43e' barStyle="light-content"/>
                    <Left style={{flex: 3, marginLeft: 8}}>
                        <Button iconLeft transparent onPress={() => {this._handle_back()}}>
                            <Image source={require('../assets/icon.png')} size={20} style={{width: 25, height: 25, resizeMode:'contain'}} />
                        </Button>
                    </Left>
                    <Body style={{flex: 2}}><Title style={{color: 'black'}}>Settings</Title></Body>
                    <Right style={{flex: 3}}>
                        <Button iconLeft transparent>
                            <Image source={require('../assets/settings.png')} size={20} style={{width: 30, height: 30, resizeMode:'contain'}} />
                        </Button>
                    </Right>
                </Header>
                
				<Content>
					<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
						<View style={{flex: 1, width: "100%", textAlign: 'center'}}>
							<View style ={{paddingBottom: 10, paddingTop: 10,  backgroundColor: '#E8E8E8'}}><Text style={{fontSize: 17, marginLeft: 13, color: 'gray'}}>Configuration: </Text></View>
							<View style={{borderBottomWidth: 1, borderColor: '#E8E8E8', paddingTop: 10, paddingBottom: 20}}>
								<Form>
									<Item picker style={{borderBottomWidth: 0}}>
										<View style={{flex: 1, flexDirection: 'row', marginLeft: 15}}>
											<Icon name='code' type='font-awesome' size={25} color="black"/>
											<Text style={{fontSize: 17, marginLeft: 10, color: 'black'}}>PIN Length:</Text>
										</View>
										<Picker
											mode="dropdown"
											iosHeader="PIN Length"
											iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
											style={{ width: undefined, marginRight: 14 }}
											itemTextStyle={{fontSize: 18, color: 'black'}}
											itemStyle={{marginLeft: 0, paddingLeft: 15 }}
											selectedValue = {this.state.pin_len_selected}
											onValueChange = {this.on_pin_length_change.bind(this)}
										>
											<Picker.Item label="2 Digits" value="2" />
											<Picker.Item label="4 Digits" value="4" />
											<Picker.Item label="6 Digits" value="6" />
										</Picker>
									</Item>
								</Form>	
								<Text style={{fontSize: 13, color: "gray", marginLeft: 15, paddingRight: 15}}>The number of digits that will display on your device's sceen during authentication. Maximum PIN length is 6, and the minimum is 4.</Text>
							</View>
							
							<View style={{borderBottomWidth: 1, borderColor: '#E8E8E8', paddingTop: 10, paddingBottom: 20}}>
								<Form>
									<Item picker style={{borderBottomWidth: 0}}>
										<View style={{flex: 1, flexDirection: 'row', marginLeft: 15}}>
											<Icon name='hourglass-half' type='font-awesome' size={25} color="black"/>
											<Text style={{fontSize: 17, marginLeft: 10, color: 'black'}}>Inactivity Timer:</Text>
										</View>
										<Picker
											mode="dropdown"
											iosHeader="Inactivity Timer"
											iosIcon={<Icon name='keyboard-arrow-down' size={25} color={'#cba830'} />}
											style={{ width: undefined, marginRight: 14 }}
											itemTextStyle={{fontSize: 18, color: 'black'}}
											itemStyle={{marginLeft: 0, paddingLeft: 15 }}
											selectedValue = {this.state.timer_selected}
											onValueChange = {this.on_inactivity_timer_change.bind(this)}
										>
											<Picker.Item label="2 Minutes" value="2" />
											<Picker.Item label="3 Minutes" value="3" />
											<Picker.Item label="4 Minutes" value="4" />
											<Picker.Item label="5 Minutes" value="5" />
										</Picker>
									</Item>
								</Form>	
								<Text style={{fontSize: 13, color: "gray", marginLeft: 15, paddingRight: 15}}>The inactivity timer functionality closes user sessions that have been idle for a specified period of time. This feature is enabled by default and the time-out value is 5 minutes. Note* inactivity timer changes will take affect on the next execution of the app.</Text>
							</View>
						
							<View>
								<View style ={{paddingBottom: 10, paddingTop: 10,  backgroundColor: '#E8E8E8'}}><Text style={{fontSize: 17, marginLeft: 13, color: 'gray'}}>Others: </Text></View>
								<ListItem title="Autofill" leftIcon={{name: 'pencil', type: 'octicon'}} bottomDivider chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
									onPress={() => {this._handle_navigate_autofill()}}/>
									
								<ListItem title="About" leftIcon={{name: 'info-circle', type: 'font-awesome'}} bottomDivider chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
									onPress={() => {this.props.navigation.navigate("About_Screen")}}/>
							</View>
						</View>
					</View>
				</Content>
            </Container>
        );
    }
}

/*
<View style={[s.container]}>
	<View style={[s.container_list]}>
		<ListItem title="Autofill" leftIcon={{name: 'pencil', type: 'octicon'}} bottomDivider chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
			onPress={() => {this._handle_navigate_autofill()}}/>

		<ListItem title="About" leftIcon={{name: 'info-circle', type: 'font-awesome'}} bottomDivider chevron={{color: "#cba830", size: 20, containerStyle: { marginRight: 10 } }}
			onPress={() => {this.props.navigation.navigate("About_Screen")}}/>

	</View>
</View>

_get_mode = async () => {
	let result = await Keychain.getGenericPassword({service: 'com.ethernom.password.manager.mobile.mode'});
	if (result) {
		let obj = JSON.parse(result.password);
		console.log('Credentials successfully loaded for user ' + result.password);
		await this.setState({switchValue: obj.mode});
	} else {
	   // this._save_mode(true);
	}
};

<View full style={[{
	backgroundColor: 'white',
	marginTop: 1,
	borderBottomColor: 'lightgray',
	borderBottomWidth: 0.5
}, s.container_switch_mode]}>
	<View style={{flex: 9, flexDirection: 'row'}}>
		<Icon name='ios-lock' type='octicon' size={25} color='#616161' style={{marginTop: 13, marginStart: 15, marginEnd: 5}}/>
		<Text style={{fontWeight: 'bold', width: 50, textAlign: 'left', marginLeft: 15, marginTop: 15}}>Mode:</Text>
		<Text style={{marginLeft: 5, marginTop: 15, width: 200, textAlign: 'left'}}>{this.state.switchValue ? 'Secure' : 'Convenient'}</Text>
	</View>
	<View style={{
		marginRight: 10,
		marginTop: 5,
		flex: 1,
		backgroundColor: 'white',
		alignItems: 'center',
		justifyContent: 'center'
	}}>
		<Switch trackColor={{true: '#ef5350', false: '#9CCC65'}}
				onValueChange={this.toggleSwitch} ios_backgroundColor={'#9CCC65'}
				value={this.state.switchValue}
				thumbColor="white"
				style={{borderWidth: 1, marginEnd: 20}}
		/>
	</View>
</View>

/*
<ListItem
	title="Advance"
	leftIcon={<Image source={require('../../assets/settings.png')} style={{width: 20, height: 20}}/>}
	bottomDivider
	chevron={{color: "#cba830", size: 20}}
	onPress={() => {this.props.navigation.navigate("AdvanceScreen");}}
/>
*/
