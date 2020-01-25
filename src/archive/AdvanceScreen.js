// ===============================================================
// ====================== IMPORT LIB =============================
// ===============================================================

// React Component
import React, {Component} from 'react';
import {Image, StatusBar, View} from 'react-native';
// UI
import {Container, Text, Button, Header, Left, Body, Right, Title, Content} from 'native-base';
let s = require('../util/main_style');
// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================
export default class AdvanceScreen extends Component {
    constructor(props) {
        super(props);
    }

    handle_back=()=> {
        if(global.openFrom === "DEVICE_SCREEN"){
            this.props.navigation.navigate("Device_Screen");
        } else {
            this.props.navigation.navigate("Vault_Screen");
        }
    };
    render() {
        return (
            <Container>
                <Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor= '#d7b43e' barStyle="light-content" />
                    <Left style={{flex: 3}}>
                        <Button iconLeft transparent onPress={() => this.handle_back()}>
                            <Image source={require('../../assets/icon.png')} size={20} style={{width: 22, height: 22,resizeMode:'contain'}} color="white" />
                        </Button>
                    </Left>
                    <Body style={{flex: 2}}><Title style={{color: 'black'}}>Settings</Title></Body>
                    <Right style={{flex: 3}}>
                        <Button iconLeft transparent onPress={() => this.props.navigation.navigate("SettingScreen")}>
                            <Image source={require('../../assets/settings.png')} size={20} style={{width: 30, height: 30,resizeMode:'contain'}} color="white" />
                        </Button>
                    </Right>
                </Header>

                <Content>
                    <View style={[s.container_header_title,{backgroundColor: 'white', justifyContent: 'center', alignItems:'center', borderBottomWidth: 1, borderColor:'#EEEEEE'}]}>
                        <Text style={{marginTop:5}}>Advance</Text>
                    </View>

                </Content>
            </Container>
        );
    }
}
