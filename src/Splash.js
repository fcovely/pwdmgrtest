import React from "react";
import {Image, View, Text, StyleSheet, Dimensions, ImageBackground, Settings, Platform} from "react-native";
import DeviceInfo from 'react-native-device-info';

let deviceWidth = Dimensions.get("window").width;

export default class Splash extends React.Component  {
    constructor (props){
        super(props);
        
        this.state = { v: "", b: ""};
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
    
    componentDidMount(){}
    componentWillUnmount(){}
	
    render() {
        return (
            <View style={[styles.container, {flex: 1}]}>
                <ImageBackground  style= {styles.backgroundImage} source={require('./assets/bg-worldmap.png')} ></ImageBackground>
				<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Image
							style={{
								width: deviceWidth/2 + 50,
								height: deviceWidth/2 + 50,transform: [{ scale: 1 }],
								alignSelf: 'center', resizeMode:'contain'
							}} source={require("./assets/logo-pass-black.png")} 
						/>
					</View>
					<View style={{flex: 1, position: 'absolute', bottom: 20}}>
						<Text style={{ fontSize: 15, textAlign: "center"}}>
							Version: {this.state.v + "." + this.state.b}
						</Text>
					</View>
				</View>
            </View>
        );
    }
}

/*
 render() {
		return (
            <>
			<StatusBar barStyle="light-content" />
			<ImageBackground  style= {styles.backgroundImage} source={require('../assets/bg-worldmap.png')} ></ImageBackground>
                
			<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <View style={{justifyContent: 'center', alignItems: 'center'}}>
					<Image
						style={{
							width: deviceWidth/2 + 50,
							height: deviceWidth/2 + 50,transform: [{ scale: 1 }],
							alignSelf: 'center', resizeMode:'contain'
						}} source={require("../assets/eth-title.png")} />

				</View>
				<View style={{flex: 1, position: 'absolute', bottom: 20}}>
					<Text style={{ fontSize: 15, textAlign: "center"}}>
						Version: 1.0.7
					</Text>
				</View>
			</View>
			</>
        );
    }
    */

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        flexDirection: "column"
    },
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