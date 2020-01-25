// ===============================================================
// ====================== IMPORT LIB =============================
// ===============================================================

// React Component
import React, {Component} from 'react';
import {View, Switch} from 'react-native';
var s = require('../util/styles');

// UI
import {Container, Text,Button, Header, Left, Body, Right, Title} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import * as Keychain from "react-native-keychain";

//Storage API
const StorageAPI = require('../util/Storage');
const Storage = new StorageAPI();

// ===============================================================
// ==================== RENDER COMPONENT =========================
// ===============================================================
export default class Settings extends Component {
	constructor(props) {
		super(props);
		this.state = {
            switchValue: false
		}
	}

    toggleSwitch = (value) => {

        this.setState({switchValue: value});
        Storage._save_mode(value);
    };


	componentDidMount() {
         this._get_mode();
    }

    _get_mode = async () => {

        let result = await Keychain.getGenericPassword({ service: 'com.ethernom.password.manager.mobile.mode' });
        if(result){
            let obj = JSON.parse(result.password);

            console.log('Credentials successfully loaded for user ' + result.password);
            await this.setState({switchValue: obj.mode});

        }else{
            this._save_mode(true);

        }
    };



	componentWillUnmount() {

    }


    render() {
		return (
			<Container>
				<Header>
					<Left></Left>
					<Body><Title>Ethernom, Inc</Title></Body>
					<Right></Right>

				</Header>

        		<View style={[s.container]}>
					<View style={[s.container_list]}>
						<Button full style={[{backgroundColor: 'white', marginTop: 1, borderBottomColor: 'lightgray', borderBottomWidth: 1}, s.container_header_title]} onPress={() => { this.props.navigation.navigate("Device"); }}>
							<View style={{width:'85%'}}>
								<Text style={{marginTop:15, marginLeft: -15, color:"black"}}>
									Device
								</Text>
							</View>
							<View style={{marginTop: 10,width:25, height: 25, backgroundColor: 'white', justifyContent:'center', alignItems: 'center'}}>
								<Icon name='ios-arrow-forward' size={25} color="black" style={{marginTop: 1, marginLeft: 1}}/>
							</View>
						</Button>

						<Button full style={[{backgroundColor: 'white', marginTop: 1, borderBottomColor: 'lightgray', borderBottomWidth: 1}, s.container_header_title]} onPress={() => { this.props.navigation.navigate("Autofill"); }}>
							<View style={{width:'85%'}}>
								<Text style={{marginTop:15, marginLeft: -15, color:"black"}}>
									Autofill
								</Text>
							</View>
							<View style={{marginTop: 10,width:25, height: 25, backgroundColor: 'white', justifyContent:'center', alignItems: 'center'}}>
								<Icon name='ios-arrow-forward' size={25} color="black" style={{marginTop: 1, marginLeft: 1}}/>
							</View>
						</Button>

                        <View full style={[{backgroundColor: 'white', marginTop: 1, borderBottomColor: 'lightgray', borderBottomWidth: 1}, s.container_header_title]}>

                            <View style={{flex: 9, flexDirection:'row'}}>
								<Text style={{fontWeight: 'bold', width: 50, textAlign: 'left',marginLeft: 15, marginTop: 15}}>Mode:</Text>
                                <Text style={{marginLeft: 5, marginTop: 15, width: 200,textAlign: 'left'}}>{this.state.switchValue?'Secure':'Convenient'}</Text>
                            </View>
                            <View style={{marginRight: 10,marginTop: 5,flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent:'center'}}>
                                <Switch trackColor={{true: '#ef5350', false: '#9CCC65'}}
										onValueChange = {this.toggleSwitch} ios_backgroundColor={'#9CCC65'}
										value = {this.state.switchValue}
                                        thumbColor="white"
                                        style={{ borderColor: '#EEEEEE', borderWidth: 1}}
								/>

                            </View>
                        </View>



					</View>
				</View>
			</Container>
		);
	}
}
