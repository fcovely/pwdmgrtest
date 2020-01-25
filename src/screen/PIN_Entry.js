import React, {Component} from 'react';
import {
  KeyboardAvoidingView,
  View,
  FlatList,
  Image,
  StatusBar,
  Dimensions,
  Keyboard,
} from 'react-native';
import {
  Container,
  Text,
  Button,
  Footer,
  Header,
  Left,
  Body,
  Right,
  Title,
} from 'native-base';
import SmoothPinCodeInput from 'react-native-smooth-pincode-input';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import KeyboardStickyView from 'rn-keyboard-sticky-view';
import {EventRegister} from 'react-native-event-listeners';

let s = require('../css/main_style');
var deviceWidth = Dimensions.get('window').width;

//ETHERNOM API;
import {PSD_MGR} from '@ethernom/ethernom_msg_psd_mgr';
var PSD_MGR_API = new PSD_MGR();

//Storage API
const StorageAPI = require('../util/Storage.js');
const Storage = new StorageAPI();

export default class PIN_Entry extends Component<Props> {
  constructor(props) {
    super(props);

    const {navigation} = this.props;
    this.state = {
      PIN: '',
      PIN_len: navigation.getParam('pin_len', 6),
      error_message: '',
      btn_submit_disable: true,
    };

    this.count = 0;
    this.curr_PIN = navigation.getParam('new_pin', '');
    this.match_PIN = this.curr_PIN.substr(
      this.curr_PIN.length - this.state.PIN_len,
    );

    this.from = navigation.getParam('from', null);
    console.log(this.from);
  }

  is_Mounted = false;

  componentDidMount() {
    this.is_Mounted = true;
    global.state.setState({spinner: {visible: false, text: ''}});
    this._on_disconnect();
  }

  componentWillUnmount() {
    this.is_Mounted = false;
  }

  _on_disconnect = () => {
    var d_id = global.E_API.currID,
      d_name = global.E_API.currName,
      d_sn = global.E_API.currSN;
    global.E_API.OnCardDisconnected(resultCode => {
      if (resultCode === ETH_SUCCESS) {
        if (this.is_Mounted == true) {
          this._handle_cancel_pin();
        }

        global.state.setState({
          spinner: {visible: false, text: ''},
          curr_device: {id: d_id, name: d_name, sn: d_sn, connected: false},
          bottom_sheets_height: 160,
        });

        EventRegister.emit('DEVICE_STATUS', false);
        global.E_API = null;
      }
    });
  };

  _handle_submit_pin = PIN_submit => {
    var match = this.curr_PIN.substr(this.curr_PIN.length - this.state.PIN_len);

    if (PIN_submit == match) {
      this._init_password_manager();
    } else {
      this.count++;
      if (this.count == 3) {
        if (global.E_API != null) {
          global.E_API.CardClose(async resultCode => {
            if (resultCode === ETH_SUCCESS) {
              global.E_API = null;
            }
          });
        }

        const {navigate} = this.props.navigation;
        navigate('Device_Screen');
      } else {
        this.setState({
          PIN: '',
          error_message: 'Error! Wrong PIN. ',
          btn_submit_disable: true,
        });
      }
    }
    /*
		global.state.setState({ spinner: {visible: true, text: "Loading: Submitting PIN..."} });
		var out_msg = PSD_MGR_API.get_outMsg_PINEntry(PIN_submit);
		var in_msg = PSD_MGR_API.inMsg_reply_OpenService();
		this._write_card(out_msg, in_msg);
		*/
  };

  _handle_cancel_pin = () => {
    const {navigate} = this.props.navigation;
    navigate('Device_Screen');

    if (global.E_API !== null) {
      global.E_API.CardClose(async resultCode => {
        if (resultCode === ETH_SUCCESS) {
          global.state.setState({spinner: {visible: false, text: ''}});
        }
      });
    }
  };

  _init_password_manager = () => {
    global.state.setState({
      spinner: {visible: true, text: 'Loading: Starting password manager...'},
    });

    var code = makeCode(6);
    var out_msg = PSD_MGR_API.outMsg_request_OpenService(
      global.device_name,
      code,
      global.device_id.substring(0, 20),
    );
    var in_msg = PSD_MGR_API.inMsg_reply_generic();

    console.log(out_msg);
    console.log(in_msg);

    global.E_API.WriteJSON_Encrypted(
      out_msg,
      in_msg,
      false,
      (resultCode, msg) => {
        if (resultCode === ETH_SUCCESS) {
          var msg_obj = JSON.parse(msg);
          this._process_reply_command(msg_obj);
        }
      },
    );
  };

  _start_key_exchange = () => {
    if (global.E_API !== null) {
      global.E_API.DoAppKeyExchange(this.curr_PIN, resultCode => {
        if (resultCode === ETH_SUCCESS) {
          console.log('pin entry key exchange success');

          global.state.setState({
            curr_device: {
              id: global.E_API.currID,
              name: global.E_API.currName,
              sn: global.E_API.currSN,
              connected: true,
            },
            bottom_sheets_height: 110,
          });

          Storage.register_peripheral_data(
            global.E_API.currID,
            global.E_API.currName,
          );
          if (this.from == null) {
            global.state.setState({
              spinner: {
                visible: true,
                text: 'Loading: Retrieving credentials...',
              },
            });

            const {navigate} = this.props.navigation;
            navigate('Device_Screen');
            navigate('Vault_Screen');
          } else if (this.from == 'RECONNECT') {
            global.state.setState({spinner: {visible: false, text: ''}});
            const {goBack} = this.props.navigation;
            goBack();
          }
        }
      });
    } else {
      console.log("E_API, doesn't exist");
    }
  };

  /*
	============================================================================================================
	======================================== WRITE/READ ========================================================
	============================================================================================================
	*/
  _write_card = (out_msg, in_msg) => {
    if (global.E_API !== null) {
      global.E_API.WriteJSON_Encrypted(
        out_msg,
        in_msg,
        true,
        (resultCode, msg) => {
          if (resultCode === ETH_SUCCESS) {
            var msg_obj = JSON.parse(msg);
            this._process_reply_command(msg_obj);
          }
        },
      );
    } else {
      console.log("E_API, doesn't exist");
      this._handle_cancel_pin();
    }
  };

  _process_reply_command = msg => {
    console.log(msg);
    switch (msg.command) {
      case PSD_MGR_API.C2H_RPLY_INIT:
        if (msg.response === PSD_MGR_API.AWK) {
          console.log('Successfully init');
          this._start_key_exchange();
        } else {
          this._handle_cancel_pin();
        }
        break;

      default:
        break;
    }
  };

  /*
	============================================================================================================
	=========================================== RENDER =========================================================
	============================================================================================================
	*/
  render() {
    const {PIN} = this.state;
    return (
      <Container>
        <Header style={{backgroundColor: '#cba830'}}>
          <StatusBar backgroundColor="#d7b43e" barStyle="light-content" />
          <Left style={{flex: 3, marginLeft: 8}}>
            <Button
              onPress={() => {
                this._handle_cancel_pin();
              }}
              transparent>
              <Text style={{color: 'black'}}>Back</Text>
            </Button>
          </Left>
          <Body style={{flex: 3}}>
            <Title style={{color: 'black'}}>Ethernom, Inc.</Title>
          </Body>
          <Right style={{flex: 3}}></Right>
        </Header>

        <View style={{flex: 1}}>
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: 16,
                marginTop: 40,
              }}>
              Authentication
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 16,
                color: '#424242',
                padding: 20,
              }}>
              <Text style={{color: 'red'}}>{this.state.error_message}</Text>
              Please enter the {this.state.PIN_len} digit PIN code that appear
              on your device screen.
            </Text>

            <View
              style={{
                marginTop: 50,
                alignItems: 'center',
                backgroundColor: '#212121',
                padding: 20,
                borderRadius: 10,
              }}>
              <SmoothPinCodeInput
                animated
                autoFocus={true}
                cellStyle={{borderBottomWidth: 2, borderColor: '#E0E0E0'}}
                cellStyleFocused={{borderColor: '#E0E0E0'}}
                textStyle={{color: 'white', fontSize: 24}}
                value={PIN}
                codeLength={this.state.PIN_len}
                keyboardType={'numeric'}
                onTextChange={PIN => {
                  this.setState({PIN});
                  if (PIN.length == this.state.PIN_len) {
                    this._handle_submit_pin(PIN);
                  }
                }}
              />
            </View>
            <View style={{marginTop: 10, alignItems: 'center'}}>
              <Image
                source={require('../assets/img-pin-entry.png')}
                style={{
                  width: deviceWidth / 1,
                  height: deviceWidth / 1,
                  alignSelf: 'center',
                  resizeMode: 'contain',
                  marginTop: 20,
                }}
              />
            </View>
          </View>
        </View>
      </Container>
    );
  }
}

/*
<KeyboardStickyView>
	<Footer>
		<View style={{flexDirection: 'row', backgroundColor: 'white'}}>
			<Button onPress={async () => {await this._handle_cancel_pin()}} transparent full style={{flexDirection: "row", backgroundColor: '#cba830', width: '50%', height:55, marginEnd: 0.5, borderRadius: 0}}>
				<Icon reverse  name='ios-arrow-back' type='ionicon'  color='black' size={20}  style={{marginLeft: 2}}/>
				<Text style={{fontSize: 15 ,color: 'black'}}>Back</Text>
			</Button>
			<Button onPress={async () => {this._handle_submit_pin()}} disabled={this.state.btn_submit_disable} transparent full style={{flexDirection: "row",  backgroundColor: this.state.btn_submit_disable ? '#9E9E9E': '#cba830' , width: '50%', height:55, borderRadius: 0}}>
				<Text style={{fontSize: 15, color: 'black'}}>Submit</Text>
				<Icon reverse  name='ios-arrow-forward' type='ionicon' color='black' size={20} style={{marginRight: 2}} />
			</Button>
		</View>
	</Footer>
</KeyboardStickyView>

<>
<KeyboardAvoidingView keyboardVerticalOffset = {64} style={{ flex: 1, position:'absolute', bottom: 0 }} behavior="padding">
						
<StatusBar barStyle="light-content" />
<View style={{flex: 1}}>
	<View style={{flex: 1, alignItems: 'center'}}>
		<Text style={{textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginTop: 40}}>Authentication</Text>
		<Text style={{textAlign: 'center', fontSize: 16,color: '#424242', padding: 20}}>
			<Text style={{color: 'red'}}>{this.state.error_message}</Text>Please enter the 6 digit PIN code that appear on your device screen.
		</Text>
		<View style={{marginTop: 50, alignItems: 'center', backgroundColor: '#212121', padding: 20, borderRadius: 10}}>
			<SmoothPinCodeInput
				cellStyle={{borderBottomWidth: 2, borderColor: '#E0E0E0'}}
				cellStyleFocused={{ borderColor: '#E0E0E0'}}
				value={PIN}
				codeLength={6} animated keyboardType={'numeric'}
				onFulfill={() => {}}
				onTextChange={PIN => {
					this.setState({PIN})
					if(PIN.length >= 6){
						this.setState({ btn_submit_disable: false })
					}else{
						this.setState({ btn_submit_disable: true })
					}
				}}
			/>
		</View>
		<View style={{marginTop: 10, alignItems: 'center'}}>
			<Image
				style={{width:  deviceWidth/1, height: deviceWidth /1, alignSelf: 'center', resizeMode: 'contain', marginTop: 20}}
				source={require('./img-pin-entry.png')}
			/>
		</View>
	</View>
	
	<KeyboardAvoidingView keyboardVerticalOffset = {64} style={{ flex: 1, position:'absolute', bottom: 0 }} behavior="padding">
		<Footer>
			<View>
				<Button onPress={() => {this._handle_cancel_pin()}} style={[s.eth_btn_left, {backgroundColor: '#d7b43e'}]}>
					<View style={{marginLeft: 10}}><Icon name='ios-arrow-back' /></View>
					<View><Text style={{color:'black'}} uppercase={false}>Cancel</Text></View>
				</Button>	
			</View>

			<View>
				<Button onPress={() => {this._handle_submit_pin()}} disabled = {this.state.btn_submit_disable} style={[s.eth_btn_right, {backgroundColor: this.state.btn_submit_disable ? '#d8d8d8' : '#d7b43e'}]}>
					<View><Text style={{color:'black'}} uppercase={false}>Submit PIN</Text></View>
					<View style={{marginRight: 10}}><Icon name='ios-arrow-forward' /></View>
				</Button>
			</View>
		</Footer>
	</KeyboardAvoidingView>
</View>
</>
*/

function makeCode(length) {
  var result = '';
  var characters = 'abcdef0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
