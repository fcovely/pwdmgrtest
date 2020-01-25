import React, {Component} from 'react';
import {Dimensions, Linking, Image, ImageBackground, View, StatusBar, StyleSheet} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';
import Icon from "react-native-vector-icons/dist/Ionicons";
import DeviceInfo from "react-native-device-info";

let s = require('../css/main_style');
var deviceWidth = Dimensions.get("window").width;

const CONSTANT_DATE = '01/08/2020 08:00 PM',
	  CONSTANT_ETH_V = 'Ethernom: SDK 1.0.36',
	  CONSTANT_FW_V = 'Firmware Support BeamU V3.45.4';

// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================
export default class About extends Component {
    constructor (props){
        super(props);
        
        this.state = { v: '', b: '' }
        DeviceInfo.getVersion().then(version => {
    		this.setState({
                v: version.replace(/\s/g, '')
            })
        });

        DeviceInfo.getBuildNumber().then(build => {
        	this.setState({
                b: build.replace(/\s/g, '')
            })
        });
    }

    componentDidMount(){
        
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
    
    _handle_navigate_settings = () => {
		const { navigate } = this.props.navigation;
		navigate("Settings_Screen");
	}

    render() {
        return (
            <Container>
                <ImageBackground  style= {styles.backgroundImage} source={require('../assets/bg-worldmap.png')} ></ImageBackground>
            	<Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor= '#d7b43e' barStyle="light-content" />
                    <Left style={{flex: 3, marginLeft: 8}}><Button onPress={() => {this._handle_navigate_settings();}} transparent><Text style={{color: 'black'}}>Back</Text></Button></Left>
                    <Body style={{flex: 3}}><Title style={{color: 'black'}}>About Us</Title></Body>
                    <Right style={{flex: 3}}></Right>
                </Header>
                <View style={[s.container]}>
                    <View style={{padding: 20, flex: 1}}>
                        <Image
                            style={{
                                width: deviceWidth/2 + 50,
                                height: deviceWidth/2 + 50,transform: [{ scale: 1 }],
                                alignSelf: 'center', resizeMode:'contain'
                            }} source={require("../assets/logo-pass-black.png")}
                        />

                        <Text style={{textAlign: 'center'}}>Version: {this.state.v + "." + this.state.b}</Text>
						<Text style={{textAlign: 'center', marginTop: 5}}>{CONSTANT_DATE}</Text>
						<Text style={{textAlign: 'center', marginTop: 5}}>{CONSTANT_ETH_V}</Text>
						<Text style={{textAlign: 'center', marginTop: 5}}>{CONSTANT_FW_V}</Text>
						<Text style={{textAlign: 'center',marginTop: 10}}>Copyright 2020 Ethernom. All Rights Reserved</Text>
						<View style={{flex: 1,flexDirection: 'row', justifyContent: 'center'}}>
							<Button transparent={true} block onPress={ ()=>{ Linking.openURL('https://ethernom.com/legal/tos')}}><Text>Terms of Service</Text></Button>
							<Button transparent={true} block onPress={ ()=>{ Linking.openURL('https://ethernom.com/legal/privacy_policy')}}><Text>Privacy Policy</Text></Button>
						</View>
                    </View>
                </View>
            </Container>
        );
    }
}

const styles = StyleSheet.create({
    backgroundImage:{
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: "center",
        alignItems: "center",
        position: 'absolute',
        top: 0,
        opacity: 0.7,
        backgroundColor: '#D3D3D3'
    },
});

/*
<View style={{flexDirection: 'row',}}>
	<Button full style={{flexDirection: "row", backgroundColor: '#cba830', width: '100%', height:55, marginEnd: 0.5}} onPress={() => {this.props.navigation.navigate("Settings_Screen")}}>
		<View style={{width: "10%",justifyContent: 'center', alignItems: 'center'}}>
			<Icon name='ios-arrow-back' size={25} color="black" style={{justifyContent: 'center',alignItems: 'center'}}/>
		</View>
		<View style={{width: "90%",justifyContent:'center', alignItems: 'center'}}>
			<Text style={{fontSize: 15 ,color: 'black', marginRight: deviceWidth*(10/100)}}>Back</Text>
		</View>
	</Button>
</View>
*/
