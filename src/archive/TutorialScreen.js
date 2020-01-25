import React, {Component} from 'react';
import {Dimensions, FlatList,Image,ImageBackground,StatusBar,StyleSheet,Text,View,Animated,Easing,BackHandler,Platform,} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import {Body, Button, Card, CardItem} from 'native-base'
import {ListItem} from "react-native-elements";
import {EventRegister} from "react-native-event-listeners";

import {EthernomAPI} from "@ethernom/ethernom-api";
import {PSD_MGR} from "@ethernom/ethernom_msg_psd_mgr"
var MAIN_E_API = null;
const PSD_MGR_API = new PSD_MGR();
import DeviceInfo from "react-native-device-info";

let Device_Width = Dimensions.get("window").width;
const StorageAPI = require('../util/Storage');
const Storage = new StorageAPI();

export default class TutorialScreen extends Component{
    constructor(props) {
        super(props);
        this.state = {
            showTutorialScreen: false,
            uiMessage: {vaultMessage: false, tutorialMessage: true, scanDeviceMessage: false, connectMessage: false},code:"",
            device_list: [],
            ui_message: {deleteDeviceMessage: false},
            peripheral: {id: "", name: "", connected: false},
            showBack: false, spinAnim: new Animated.Value(0)
        };
        global.device_name = "";

    }

    handleBackButton = () => {
        if (this.props.navigation.isFocused()) {
            BackHandler.exitApp();
            return true;
        }
        return false;

    };

    async componentDidMount() : void{

        await this.handleSaveTutorials();

        if (Platform.OS === "android") {
            BackHandler.addEventListener('hardwareBackPress', this.handleBackButton);

        }
        this._init_e_api();
        await this._init_app();
        this.listener = EventRegister.addEventListener('TUTORIAL_EVENT', (data) => {
            var rcv_msg = JSON.parse(data);
            console.log(rcv_msg);

            switch (rcv_msg.title) {
                case "REPLY_BLE_CONNECTING_PERIPHERAL":

                    this.setState({
                        uiMessage: {vaultMessage: false, tutorialMessage: false, scanDeviceMessage: false, scanConnect: false,connectMessage: true},
                        code: rcv_msg.data.code, peripheral: {id: rcv_msg.data.deviceID, name: rcv_msg.data.deviceName, connected: true},
                    });

                    break;

                case "REPLY_BLE_CONNECTED_PERIPHERAL":
                   this.gotToVault();

                    let device = {id: rcv_msg.device,name: rcv_msg.device_name, connected: true};
                    var msg = {title: "READY", from: "TUTORIAL", peripheral: device};
                    EventRegister.emit('VAULT_EVENT', JSON.stringify(msg));

                    break;

                default:
                    break;
            }

        });
    }

    startAnimation() {
        Animated.loop(Animated.timing(
            this.state.spinAnim,
            {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true
            }
        )).start();
    }


    gotToVault = async () => {
        await this.props.navigation.navigate("Vault_Screen");
    };
    _init_e_api = () => {
        if(MAIN_E_API != null){
            MAIN_E_API.StopDiscovery();
            MAIN_E_API.DisconnectListeners();
            MAIN_E_API = null;
        }

        console.log("init_e_api");
        MAIN_E_API = new EthernomAPI("BLE", PSD_MGR_API.SERIVCE_PORT, -1, true, true,(resultCode) =>{
            if (resultCode === ETH_SUCCESS){
                MAIN_E_API.DiscoverDevices(this._device_discovery);
            }


        });
    };
    _init_app = async () => {
        global.device_name = await DeviceInfo.getDeviceName().then(deviceName => {
            if(deviceName.length === 1)
                return deviceName + " ";
            return deviceName
        });
        global.device_id = await  DeviceInfo.getDeviceId().then(deviceId => {
            return deviceId
        });

    };

    _device_discovery = (resultCode, deviceID, deviceName) => {
        var obj = [{name: deviceName, id: deviceID}];
        var list = this.state.device_list;
        if(list.length){
            for(var i=0; i<list.length; i++){
                if(list[i].name === obj[0].name && list[i].id === obj[0].id) return
            }
        }

        list = list.concat(obj);

        this.setState({
            device_list: list
        });
    };

    handleSaveTutorials = async () => {
        console_log("Tutorial Saved.");
        await Storage._save_tutorial_screen();
    };

    _handle_start_scan_device = () => {
        this.startAnimation();
        this.setState({uiMessage: {vaultMessage: false, tutorialMessage: false, scanDeviceMessage: true, connectMessage: false,scanConnect: false}});
    };

    _handle_tutorial_screen = () => {
        this.setState({uiMessage: {vaultMessage: false, tutorialMessage: true, scanDeviceMessage: false, connectMessage: false,scanConnect: false}});
    };

    _handle_item_device_click =(item) => {
        this._register_device(item);
        this.setState({
            peripheral: {id: item.id, name: item.name, connected: false},
            uiMessage: {vaultMessage: false, tutorialMessage: false, scanDeviceMessage: false, scanConnect: false,connectMessage: true},
        });
    };

    _handle_cancel_connect_device=() => {
        this.setState({uiMessage: {vaultMessage: false, tutorialMessage: false, scanDeviceMessage: true, connectMessage: false,scanConnect: false}});

        if(MAIN_E_API != null){
            MAIN_E_API.UnSubscribeToUnsolictedEvents();
            MAIN_E_API.CardClose(this._callback());
            MAIN_E_API.StopDiscovery();

            MAIN_E_API = null;
        }

    };

    _callback = () => {
        console_log("Disconnect Success")
    };


    _register_device = (item) => {
        this._approve_register_device(item);
    };

    _approve_register_device = (item) => {
        if(MAIN_E_API != null){
            MAIN_E_API.StopDiscovery();
            MAIN_E_API.DisconnectListeners();
            MAIN_E_API = null;
        }
        let peripheral = {id: item.id, name: item.name, connected: false, globalDevice: global.device_name, globalDeviceID: global.device_id};

        var msg = { title: 'REQUEST_CONNECT_DEVICE', from: "TUTORIAL", peripheral: peripheral, status: false};
        EventRegister.emit('BLE_EVENT', JSON.stringify(msg));

    };

    _renderItem = ({item}) => {

        return (
            <View style={styles.BlockStyle}>
                <ImageBackground
                    style={{height: 180}}
                    source={require('../../assets/bg-black.png')}
                    imageStyle={{resizeMode: 'cover'}}>
                    <Image style={{width: Device_Width / 2.2, height: Device_Width / 2.2, alignSelf: 'center', resizeMode: 'contain', marginTop: 10,}}
                           source={require('../../assets/logo-pass-white.png')}
                    />
                </ImageBackground>

                <View style={{marginTop: 25}}>
                    <Text style={styles.TextStyle}> {item.title} </Text>
                    <Image style={{width: Device_Width / 3, height: Device_Width / 3, alignSelf: 'center', resizeMode: 'contain', marginTop: 30}}
                           source={item.image}
                    />
                    <Text style={{fontSize: 14,color: 'black', textAlign: 'center', alignSelf: 'center', width: Device_Width/1.5, marginTop: 30}}>
                        {item.text}
                    </Text>
                    <View style={{display: item.key === "k1" ? 'flex' : 'none'}}>
                        <Text style={styles.SmalTextStyle}>
                            {item.desc}
                        </Text>
                    </View>
                    <View style={{alignItems: 'center', justifyContent: 'center', display: item.key === "k2" ? 'flex' : 'none'}}>
                        <Button onPress={() => this._handle_start_scan_device()}
                                style={{width: '80%',height: 60, justifyContent: 'center', backgroundColor: '#cba830', borderRadius: 20, marginTop: 30
                                }}>
                            <Text style={{fontSize: 18, color: 'black', fontWeight: 'bold'}}> Start </Text>
                        </Button>
                    </View>
                </View>
            </View>
        )
    };

    _renderDoneButton = () => {
        return (
            <View style={{marginTop: 15}}>
                <Text>Back</Text>
            </View>
        );
    };

    on_Skip_slides = () => {
        this.props.navigation.navigate("Device_Screen");
    };
    render() {
        const spin = this.state.spinAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg']
        });

        if(this.state.uiMessage.tutorialMessage) {
            return <AppIntroSlider renderItem={this._renderItem}
                                   dotStyle={{backgroundColor: '#BDBDBD',width: 12, height: 12, borderRadius: 50, marginLeft: 5, marginRight: 5}}
                                   activeDotStyle={{backgroundColor: '#cba830', width: 12, height: 12, borderRadius: 50,  marginLeft: 5, marginRight: 5}}
                                   style={{backgroundColor: "white", display: this.state.uiMessage.tutorialMessage ? 'flex' : 'none'}}
                                   slides={slides}
                                   showSkipButton={global.fromDevice}
                                   renderSkipButton={this._renderDoneButton}
                                   onSkip={this.on_Skip_slides}

            />
        } else {
            return (
                <View>
                    <StatusBar backgroundColor= '#d7b43e' barStyle="light-content" />
                    {/*state 1*/}
                    <View style={{display: this.state.uiMessage.scanDeviceMessage? 'flex': 'none'}}>
                        <View style={styles.BlockStyle}>
                            <ImageBackground style={{height: 180}} source={require('../../assets/bg-black.png')} imageStyle={{resizeMode: 'cover'}}>
                                <Image
                                    style={{width: Device_Width / 2.2, height: Device_Width / 2.2, alignSelf: 'center', resizeMode: 'contain', marginTop: 10}}
                                    source={require('../../assets/logo-pass-white.png')}
                                />
                            </ImageBackground>


                            <View>
                                <View full style={{flexDirection:'row',paddingEnd: 10, paddingStart: 10,backgroundColor: 'white',height: 65, alignItems:'center',justifyContent: 'center', borderBottomColor: 'lightgray', borderBottomWidth: 0.5}}>

                                    <View style={{width: 20, height: 20, marginLeft: 0}}>
                                        <Animated.Image
                                            style={{ height: 20, width: 20, resizeMode: 'contain', transform: [{rotate: spin}] }}
                                            source={require('../../assets/img/refresh_button.png')} />
                                    </View>
                                    <View style={{width:'85%', marginStart: 15}}>
                                        <Text style={{marginLeft: 15}}>
                                            Search for nearby devices...
                                        </Text>
                                    </View>
                                    <View style={{width: 20, height: 20, marginBottom: 20}}>
                                        <Button transparent onPress={() => this._handle_tutorial_screen()}>
                                            <View style={{width: 20, height: 20}}>
                                                <Image source={require('../../assets/img/question_mark.png')} style={[{width: 15, height: 15},styles.localImage]}/>
                                            </View>
                                        </Button>
                                    </View>

                                </View>

                                <FlatList
                                    scrollEnabled={true}
                                    data= {this.state.device_list}
                                    renderItem={({ item }) => (
                                        <ListItem button onPress={() => {this._handle_item_device_click(item)}}
                                                  title={item.name}
                                                  subtitle={item.id}
                                                  chevron={{color: "#cba830", size: 20}}
                                                  bottomDivider
                                        />
                                    )}
                                />

                            </View>
                        </View>
                    </View>

                    {/*state 2*/}
                    <View style={{display: this.state.uiMessage.connectMessage? 'flex': 'none'}}>
                        <View style={[styles.BlockStyle, {justifyContent: 'center'}]}>
                            <ImageBackground
                                style={{height: 180}}
                                source={require('../../assets/bg-black.png')}
                                imageStyle={{resizeMode: 'cover'}}>
                                <Image
                                    style={{width: Device_Width / 2.2, height: Device_Width / 2.2, alignSelf: 'center', resizeMode: 'contain', marginTop: 10}}
                                    source={require('../../assets/logo-pass-white.png')}
                                />
                            </ImageBackground>

                            <View style={{marginTop: 15}}>
                                <View style={{flexDirection: 'row' , alignItems: 'center', justifyContent: 'center'}}>
                                    <Text style={styles.TextStyle}> Connecting Ethernom {this.state.peripheral.name} </Text>
                                </View>

                                <Image
                                    style={{width: Device_Width / 3, height: Device_Width / 3, alignSelf: 'center', resizeMode: 'contain', marginTop: 30,}}
                                    source={require('../../assets/turtorial-pass1.png')}
                                />
                            </View>

                            <View style={{justifyContent: 'center', alignItems: 'center', marginTop: 10}}>
                                <View style={{justifyContent: 'center', width: Device_Width/2 + 20, height: 150, marginTop: 10}}>
                                    <Card>
                                        <CardItem>
                                            <Body>
                                            <Text style={{marginTop:10, textAlign: 'left'}}>
                                                Device's name: <Text style={{fontWeight: 'bold'}}>{"\n" + global.device_name + "\n\n"}</Text>
                                                Confirmation code: <Text style={{fontWeight: 'bold'}}>{"\n" + this.state.code + "\n"}</Text>
                                            </Text>
                                            <Text style={{color: '#9E9E9E', fontSize: 12, fontStyle:'italic'}}>
                                                On your Ethernom, {"\n"}please approve the connection.
                                            </Text>
                                            </Body>
                                        </CardItem>
                                    </Card>
                                </View>
                            </View>
                            <View style={{
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Button onPress={() => this._handle_cancel_connect_device()}
                                        style={{
                                            width: '80%',height: 60,
                                            justifyContent: 'center',
                                            backgroundColor: '#cba830',
                                            borderRadius: 20,
                                            marginTop: 30
                                        }}>
                                    <Text style={{fontSize: 18, color: 'black', fontWeight: 'bold'}}> Cancel Connect </Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </View>
            )
        }
    }
}
const slides = [
    {
        key: 'k1',
        title: 'Ready to setup your device?',
        text: 'Welcome to the setup page!\nTo start setup process,',
        desc: 'Please launch Password Manager on your device',
        image: require('../../assets/turtorial-pass1.png'), backgroundColor: '#59b2ab', icon: 'ios-images-outline',
    },
    {
        key: 'k2',
        title: 'Start setup!',
        text: 'Scan for connect via\nBluetooth',
        desc: 'Start',
        image: require('../../assets/tutorial-pass2.png'), backgroundColor: '#59b2ab', icon: 'ios-images-outline',
    }
];
const styles = StyleSheet.create({
    localImage: {
        transform: [{scale: 1}],
        alignSelf: 'center', resizeMode: 'contain'
    },
    buttonCircle: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0, 0, 0, .2)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: 320,
        height: 320,
    },
    MainContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    BlockStyle: {
        backgroundColor: 'white',
        flexDirection: 'column',
        width: Device_Width,
    },
    TextStyle: {
        fontSize: 17,
        color: 'black',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    SmalTextStyle: {
        fontSize: 14,
        color: 'black',
        textAlign: 'center',
        marginTop: 20,
    },
    ListTextStyle: {
        fontSize: 17,
        color: 'black',
        fontWeight: 'bold',
    },
});
function console_log(string){
    console.log("TUTORIAL component: " + string);
}
