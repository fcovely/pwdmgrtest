import React, {Component} from 'react';
import {AppState, View, StatusBar, Image, Dimensions, Linking, Platform} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';
import Video from 'react-native-video';
import Icon from "react-native-vector-icons/dist/Ionicons";

import AndroidOpenSettings from 'react-native-android-open-settings';

var s = require('../css/styles');
const screenWidth = Math.round(Dimensions.get('window').width);
const ratio = (screenWidth - 80) / 744;

export default class Autofill extends Component {
    constructor(props) {
        super(props);

        this.state = {
            appState: AppState.currentState, 
            autofill_video: null,
        };
		
		const { navigation } = this.props;
		this.from = navigation.getParam('from');
		
        this.autofill_mp4 = null;
        if (Platform.OS === 'android') {
            this.autofill_mp4 = require('../assets/android_autofill_tutorial.mp4');
        } else {
            this.autofill_mp4 = require('../assets/autofill_tutorial.mp4');
        }
    }

    componentDidMount(){
    
    }

    componentWillUnmount() {
    
    }

    _handleAppStateChange = (nextAppState) => {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            this.props.navigation.navigate('Device_Screen');
            AppState.removeEventListener('change', this._handleAppStateChange);
        }
        this.setState({appState: nextAppState});
    };

    _handle_header_back = () => {
        if(global.E_API != null){
    		this.props.navigation.navigate("Vault_Screen");
    	}else{
    		this.props.navigation.navigate("Device_Screen");
    	}
    };
    
    _handle_back = () => {
    	if(this.from == "SETTINGS"){
    		this.props.navigation.navigate("Settings_Screen");
    	}else if(this.from == "DEVICE"){
    		this.props.navigation.navigate("Device_Screen");
    	}
    }

    _go_to_system_settings = () => {
        if(this.from == "DEVICE"){
        	AppState.removeEventListener('change', this._handleAppStateChange);
        	AppState.addEventListener('change', this._handleAppStateChange);
        }
        
        if (Platform.OS === 'android') {
            AndroidOpenSettings.generalSettings();
        }else{
        	Linking.openURL('App-Prefs:{0}');
        }
    }

    render() {
        return (
            <Container>
                <Header style={{backgroundColor: '#cba830'}}>
                    <StatusBar backgroundColor='#d7b43e' barStyle="light-content"/>
                   	<Left style={{flex: 3, marginLeft: 8}}><Button onPress={() => {this._handle_back();}} transparent><Text style={{color: 'black'}}>Back</Text></Button></Left>
                    <Body style={{flex: 3}}><Title style={{color: 'black'}}>Autofill</Title></Body>
                    <Right style={{flex: 3}}></Right>
                </Header>
                <Content>
                    <Text style={{textAlign: 'center', fontWeight: 'bold', margin: 20, fontSize: 20}}>Let's set up Autofill:</Text>
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Video source={this.autofill_mp4}   // Can be a URL or a local file.
						   ref={(ref) => {
							   this.player = ref;
						   }}
						   onBuffer={this.onBuffer}
						   onError={this.videoError}
						   repeat={true}
						   muted={true}
						   style={{width: screenWidth - 60, height: 744 * ratio}}
                        />
                    </View>
                    
                    <View style={{flex: 1, padding: 20, display: Platform.OS === 'ios' ? 'flex' : 'none'}}>
                        <Text>1. Open the Settings app</Text>
                        <Text style={{marginTop: 10, fontSize: 14}}>2. Tap Passwords & Accounts</Text>
                        <Text style={{marginTop: 10, fontSize: 14}}>3. Tap Autofill Passwords</Text>
                        <Text style={{marginTop: 10, fontSize: 14}}>4. Enable Autofill</Text>
                        <Text style={{marginTop: 10, fontSize: 14}}>5. Tap Ethernom Password Manager to {'\n'}enable and
                            log in</Text>
                        <Text style={{marginTop: 10, fontSize: 14}}>Optional: Tap keychain to disable</Text>
                    </View>

                    <View style={{flex: 1, padding: 20, display: Platform.OS === 'android' ? 'flex' : 'none'}}>
                        <Text>1. Open the Settings app</Text>
                        <Text style={{marginTop: 10}}>2. Go to System > Language & Input</Text>
                        <Text style={{marginTop: 10}}>3. Tap Autofill Service</Text>
                        <Text style={{marginTop: 10}}>4. On the Autofill service,</Text>
                        <Text style={{marginTop: 10}}> select 'Ethernom Autofill Sevice'.</Text>
                    </View>

                    <View>
                        <Button onPress={() => this._go_to_system_settings()} rounded success
                                style={{justifyContent: 'center', marginBottom: 20, marginEnd: 40, marginStart: 40}}>
                            <Text style={{textAlign: 'center', fontWeight: 'bold'}}>Go to settings</Text>
                        </Button>
                    </View>
                </Content>
            </Container>
        );
    }
}

/*
<View>
	<Button full style={{backgroundColor: '#cba830', height: 55}} onPress={() => {this._handle_back();}}>
		<View style={{width: "10%",justifyContent: 'center', alignItems: 'center'}}>
			<Icon name='ios-arrow-back' size={25} color="black" style={{justifyContent: 'center',alignItems: 'center'}}/>
		</View>
		<View style={{width: "90%",justifyContent:'center', alignItems: 'center'}}>
			<Text style={{color: 'black', textAlign:'center', marginRight: screenWidth*(10/100)}}>Back</Text>
		</View>
	</Button>
</View>

<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
	<Image
		style={{width:screenWidth-60, height: 744 * ratio}}
		source={require('./../../assets/autofill_tutorial.gif')}
		resizeMode="contain"
	/>
</View>
*/
