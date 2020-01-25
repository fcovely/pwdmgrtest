import React, {Component} from 'react';
import {
  Clipboard,
  View,
  FlatList,
  Dimensions,
  Image,
  StatusBar,
  AppState,
} from 'react-native';
import {
  Container,
  Text,
  Button,
  Header,
  Left,
  Body,
  Right,
  Title,
  Toast,
  Input,
  InputGroup,
} from 'native-base';
import {ListItem} from 'react-native-elements';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import Dialog from 'react-native-dialog';
import RBSheet from 'react-native-raw-bottom-sheet';
import {EventRegister} from 'react-native-event-listeners';

let s = require('../css/main_style');
var deviceWidth = Dimensions.get('window').width;

//ETHERNOM API;
import {PSD_MGR} from '@ethernom/ethernom_msg_psd_mgr';
var PSD_MGR_API = new PSD_MGR();

export default class Vault extends Component {
  curr_credential = null;
  constructor(props) {
    super(props);
    this.state = {
      appState: AppState.currentState,
      search_value: '',
      filter_credentials_list: [],
      curr_credential_name: '',
      alert: {delete_alert: false, max_account: false},
      connected: global.state.state.curr_device.connected,
    };
  }

  componentDidMount() {
    global.credentials_list = [];
    this.setState({
      search_value: '',
      filter_credentials_list: [],
      alert: {delete_alert: false, max_account: false},
    });

    this._init_credentials_list();
    this._subsribe_device_status_listener();
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    if (this.did_focus_vault_screen != null)
      this.did_focus_vault_screen.remove();
    EventRegister.removeEventListener(this.device_status_listener);
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _subsribe_device_status_listener = () => {
    if (this.device_status_listener != null)
      EventRegister.removeEventListener(this.device_status_listener);
    this.device_status_listener = EventRegister.addEventListener(
      'DEVICE_STATUS',
      status => {
        this.setState({connected: status});
      },
    );
  };

  _handleAppStateChange = nextAppState => {
    if (nextAppState === 'background') {
      this._reset_state();
    }
    this.setState({appState: nextAppState});
  };

  _reset_state = () => {
    this.setState({
      search_value: '',
      filter_credentials_list: [],
      curr_credential_name: '',
      alert: {delete_alert: false, max_account: false},
    });
  };

  _focus_listener = () => {
    if (this.did_focus_vault_screen != null)
      this.did_focus_vault_screen.remove();

    const {navigation} = this.props;
    this.did_focus_vault_screen = navigation.addListener('didFocus', () => {
      global.state.setState({spinner: {visible: false, text: ''}});
      this.setState({
        filter_credentials_list: global.credentials_list,
        search_value: '',
        alert: {delete_alert: false, max_account: false},
        connected: global.state.state.curr_device.connected,
      });
    });
  };

  _init_credentials_list = () => {
    console.log('fetch accounts');
    var index = 0;
    var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
    var in_msg = PSD_MGR_API.inMsg_reply_getAccount();
    this._write_card(out_msg, in_msg);
  };

  /*
	============================================================================================================
	======================================== WRITE/READ ========================================================
	============================================================================================================
	*/
  _write_card = (out_msg, in_msg) => {
    console.log(out_msg);
    console.log(in_msg);

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
      global.reconnect_manager.request_reconnect(
        global.state.state.curr_device.id,
        global.state.state.curr_device.name,
        global.state.state.curr_device.sn,
        async done => {
          global.state.setState({
            spinner: {visible: false, text: ''},
            curr_device: {
              id: global.E_API.currID,
              name: global.E_API.currName,
              sn: global.E_API.currSN,
              connected: true,
            },
            bottom_sheets_height: 110,
          });

          this._write_card(out_msg, in_msg);
        },
      );
    }
  };

  _process_reply_command = msg => {
    switch (msg.command) {
      case PSD_MGR_API.C2H_RPLY_GET_NEXT_ACCOUNT_FOR_DISPLAY:
        if (msg.response === PSD_MGR_API.AWK) {
          var obj = [{key: msg.name, url: msg.url, username: msg.username}];
          global.credentials_list = obj.concat(global.credentials_list);

          if (global.state.state.spinner.visible == false) {
            global.state.setState({
              spinner: {
                visible: true,
                text: 'Loading: Retrieving credentials...',
              },
            });
          }

          this.setState({filter_credentials_list: global.credentials_list});

          var index = msg.index;
          var out_msg = PSD_MGR_API.outMsg_request_getAccount(index);
          var in_msg = PSD_MGR_API.inMsg_reply_getAccount();
          this._write_card(out_msg, in_msg);
        } else if (msg.response === PSD_MGR_API.OTHER) {
          console.log('Retrieving data done...');
          global.state.setState({spinner: {visible: false, text: ''}});
          this._focus_listener();
        }
        break;

      case PSD_MGR_API.C2H_RPLY_GET_ACCOUNT_PASS:
        if (msg.response === PSD_MGR_API.AWK) {
          console.log(msg.password);
          this._handle_copy_to_clipboard(msg.password, 'Password copied');
        }
        break;

      case PSD_MGR_API.C2H_RPLY_DELETE_ACCOUNT:
        if (msg.response === PSD_MGR_API.AWK) {
          console.log('delete successfull');
          this._remove_deleted_credential();
        } else {
          console.log('delete unsuccessfull');
        }
        break;

      default:
        break;
    }
  };

  /*
	============================================================================================================
	======================================== TOAST UI ==========================================================
	============================================================================================================
	*/
  _handle_copy_to_clipboard = (text, toast_text) => {
    Clipboard.setString(text);
    this.bottom_sheets_credentials.close();
    this._show_toast(toast_text);
  };

  _show_toast = text => {
    Toast.show({
      text: text,
      buttonText: 'Okay',
      position: 'bottom',
      duration: 4000,
      type: 'success',
    });
  };

  /*
	============================================================================================================
	======================================== SEARCH UI =========================================================
	============================================================================================================
	*/
  _on_search_text = text => {
    if (global.E_API != null) {
      if (global.credentials_list.length > 0) {
        this.setState({search_value: text});

        if (text === '') {
          this.setState({
            filter_credentials_list: global.credentials_list,
            isSearch: false,
          });
        } else {
          var newData = [];
          var search = text.toLowerCase();
          for (var i = 0; i < global.credentials_list.length; i++) {
            var currName = global.credentials_list[i].key.toLowerCase(),
              currUrl = global.credentials_list[i].url.toLowerCase(),
              currPass = global.credentials_list[i].username.toLowerCase();

            if (
              currName.includes(search) ||
              currUrl.includes(search) ||
              currPass.includes(search)
            ) {
              newData = newData.concat(global.credentials_list[i]);
            }
          }

          this.setState({filter_credentials_list: newData, isSearch: true});
        }
      } else {
        this.setState({
          search_value: text,
          filter_credentials_list: [],
          isSearch: false,
        });
      }
    }
  };

  _clear_search_text = () => {
    this.setState({
      search_value: '',
      filter_credentials_list: global.credentials_list,
      isSearch: false,
    });
  };

  /*
	============================================================================================================
	==================================== BOTTOM SHEETS UI ======================================================
	============================================================================================================
	*/
  _handle_open_bottom_sheets_device = () => {
    global.bottom_sheets_device.open();
  };

  _handle_open_bottom_sheets_credentials = item => {
    this.curr_credential = {
      url: item.url,
      username: item.username,
      name: item.key,
    };
    this.setState({curr_credential_name: item.key});
    this.bottom_sheets_credentials.open();
  };

  _handle_copy_password = (url, username) => {
    var out_msg = PSD_MGR_API.outMsg_request_getAccount_password(url, username);
    var in_msg = PSD_MGR_API.inMsg_reply_getAccount_password();
    this._write_card(out_msg, in_msg);
  };

  _handle_delete_credential = () => {
    global.state.setState({
      spinner: {visible: true, text: 'Loading: Deleting credential...'},
    });

    var out_msg = PSD_MGR_API.outMsg_request_deleteAccount(
      this.curr_credential.url,
      this.curr_credential.username,
    );
    var in_msg = PSD_MGR_API.inMsg_reply_generic();
    this._write_card(out_msg, in_msg);
  };

  _remove_deleted_credential = () => {
    var updated_list = global.credentials_list;
    if (global.credentials_list.length > 0) {
      for (var i = 0; i < global.credentials_list.length; i++) {
        if (
          this.curr_credential.name == global.credentials_list[i].key &&
          this.curr_credential.url == global.credentials_list[i].url &&
          this.curr_credential.username == global.credentials_list[i].username
        ) {
          updated_list.splice(i, 1);
          break;
        }
      }

      global.credentials_list = updated_list;
      if (this.state.search_value == '') {
        this.setState({filter_credentials_list: global.credentials_list});
      } else {
        this._on_search_text(this.state.search_value);
      }
    } else {
      global.credentials_list = [];
      this.setState({filter_credentials_list: []});
    }

    this.curr_credential = null;
    this._show_toast('Successfully deleted account');

    this.setState({alert: {delete_alert: false, max_account: false}});
    global.state.setState({spinner: {visible: false, text: ''}});
  };

  _handle_delete_alert = () => {
    this.bottom_sheets_credentials.close();
    var parent = this;
    setTimeout(function() {
      parent.setState({alert: {delete_alert: true, max_account: false}});
    }, 300);
  };

  /*
	============================================================================================================
	====================================== NAVIGATE ============================================================
	============================================================================================================
	*/
  _handle_navigate_view = () => {
    this.bottom_sheets_credentials.close();
    global.state.setState({
      spinner: {
        visible: true,
        text: "Loading: retrieving credential's data...",
      },
    });

    const {navigate} = this.props.navigation;
    this.props.navigation.navigate('View_Account_Screen', {
      name: this.curr_credential.name,
      url: this.curr_credential.url,
      username: this.curr_credential.username,
    });
  };

  _handle_navigate_edit = () => {
    this.bottom_sheets_credentials.close();
    global.state.setState({
      spinner: {
        visible: true,
        text: "Loading: retrieving credential's data...",
      },
    });

    const {navigate} = this.props.navigation;
    this.props.navigation.navigate('Edit_Account_Screen', {
      name: this.curr_credential.name,
      url: this.curr_credential.url,
      username: this.curr_credential.username,
    });
  };

  _handle_navigate_add_staging = () => {
    if (global.credentials_list.length == 100) {
      var parent = this;
      setTimeout(function() {
        parent.setState({alert: {delete_alert: false, max_account: true}});
      }, 300);
    } else {
      const {navigate} = this.props.navigation;
      this.props.navigation.navigate('Add_Staging_Screen');
    }
  };

  _handle_navigate_settings = () => {
    const {navigate} = this.props.navigation;
    navigate('Settings_Screen');
  };

  /*
	============================================================================================================
	====================================== DISCONNECT ==========================================================
	============================================================================================================
	*/
  _handle_disconnect_device = () => {
    if (global.E_API != null) {
      global.E_API.CardClose((callback = resultCode => {}));
    }

    global.bottom_sheets_device.close();
    const {navigate} = this.props.navigation;
    navigate('Device_Screen');
  };

  /*
	============================================================================================================
	========================================== RENDER ==========================================================
	============================================================================================================
	*/
  render() {
    return (
      <Container>
        <View>
          <Dialog.Container visible={this.state.alert.delete_alert}>
            <Dialog.Title>Delete account</Dialog.Title>
            <Dialog.Description>
              Do you want to delete this account? You cannot undo this action.
            </Dialog.Description>
            <Dialog.Button
              label="Cancel"
              onPress={() => {
                this.setState({
                  alert: {delete_alert: false, max_account: false},
                });
              }}
            />
            <Dialog.Button
              label="Delete"
              onPress={() => {
                this._handle_delete_credential();
              }}
              color="#f44336"
            />
          </Dialog.Container>

          <Dialog.Container visible={this.state.alert.max_account}>
            <Dialog.Title>Error</Dialog.Title>
            <Dialog.Description>
              You have reached max capacity of 100 accounts. Please delete at
              least one before adding a new account.
            </Dialog.Description>
            <Dialog.Button
              label="Cancel"
              onPress={() => {
                this.setState({
                  alert: {delete_alert: false, max_account: false},
                });
              }}
            />
          </Dialog.Container>
        </View>

        <Header style={{backgroundColor: '#cba830'}}>
          <StatusBar backgroundColor="#d7b43e" barStyle="light-content" />
          <Left style={{flex: 3, marginLeft: 8}}>
            <Button iconLeft transparent disabled={true}>
              <Image
                source={require('../assets/icon.png')}
                size={20}
                style={{width: 25, height: 25, resizeMode: 'contain'}}
              />
            </Button>
          </Left>
          <Body style={{flex: 1}}>
            <Title style={{color: 'black'}}>Vault</Title>
          </Body>
          <Right style={{flex: 3}}>
            <Button
              onPress={() => this._handle_navigate_settings()}
              iconLeft
              transparent>
              <Image
                source={require('../assets/settings.png')}
                size={20}
                style={{width: 30, height: 30, resizeMode: 'contain'}}
              />
            </Button>
          </Right>
        </Header>

        <Button
          onPress={() => this._handle_open_bottom_sheets_device()}
          full
          style={[
            s.eth_btn_full,
            s.bg_black,
            {backgroundColor: 'black', height: 60},
          ]}>
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center'}}>
            <Icon
              name={'ios-radio-button-on'}
              color={this.state.connected ? '#ADFF2F' : 'red'}
              style={{marginLeft: 15}}
              size={30}
            />
            <Text style={{color: 'white', fontWeight: 'bold'}}>
              {global.state.state.curr_device.name}
            </Text>
            <Icon
              style={{marginRight: 18, position: 'absolute', right: 0}}
              name={'ios-settings'}
              color="white"
              size={20}
            />
          </View>
        </Button>

        <View
          searchBar
          style={{flexDirection: 'row', padding: 15, backgroundColor: 'black'}}>
          <InputGroup
            rounded
            style={{
              flex: 1,
              backgroundColor: '#fff',
              height: 35,
              paddingLeft: 10,
              paddingRight: 10,
              marginTop: 0,
            }}>
            <Icon name="ios-search" size={20} />
            <Input
              onChangeText={text => this._on_search_text(text)}
              placeholder="Search"
              style={{paddingBottom: 4, marginLeft: 10}}
              autoCorrect={false}
              value={this.state.search_value}
              returnKeyType={'done'}
              clearButtonMode={'always'}
            />
          </InputGroup>

          <Button
            onPress={() => this._clear_search_text()}
            transparent
            style={{
              height: 30,
              display: this.state.isSearch ? 'flex' : 'none',
            }}>
            <Text style={{color: 'white'}}>Cancel</Text>
          </Button>
        </View>

        <FlatList
          style={{backgroundColor: 'white'}}
          data={this.state.filter_credentials_list}
          renderItem={({item}) => (
            <ListItem
              title={item.key}
              subtitle={item.username}
              onPress={() => {
                this._handle_open_bottom_sheets_credentials(item);
              }}
              rightIcon={{
                name: 'ios-key',
                type: 'ionicon',
                color: '#cba830',
                size: 25,
                iconStyle: {padding: 10},
                onPress: () =>
                  this._handle_copy_password(item.url, item.username),
              }}
              bottomDivider
            />
          )}
          keyExtractor={(item, index) => index.toString()}
        />

        <View>
          <Button
            full
            style={{
              backgroundColor: '#cba830',
              flexDirection: 'row',
              alignItems: 'stretch',
              paddingTop: 5,
              paddingBottom: 5,
              height: 55,
            }}
            onPress={() => {
              this._handle_navigate_add_staging();
            }}>
            <View
              style={{
                width: '90%',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: 'black',
                  textAlign: 'center',
                  marginLeft: deviceWidth * (10 / 100),
                }}>
                Add account
              </Text>
            </View>
            <View
              style={{
                width: '10%',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Icon
                name="ios-arrow-forward"
                size={25}
                color="black"
                style={{justifyContent: 'center', alignItems: 'center'}}
              />
            </View>
          </Button>
        </View>

        <View>
          <RBSheet
            ref={ref => {
              this.bottom_sheets_credentials = ref;
            }}
            height={310}
            duration={250}>
            <View>
              <ListItem
                title={this.state.curr_credential_name}
                leftIcon={{
                  name: 'ios-information-circle-outline',
                  type: 'ionicon',
                  size: 20,
                  color: '#cba830',
                }}
                bottomDivider
              />
              <ListItem
                onPress={() =>
                  this._handle_copy_to_clipboard(
                    this.curr_credential.username,
                    'Username copied',
                  )
                }
                titleStyle={{fontSize: 14}}
                title="Copy Username"
                rightIcon={{
                  name: 'ios-contact',
                  type: 'ionicon',
                  size: 20,
                  color: '#cba830',
                }}
              />
              <ListItem
                onPress={() =>
                  this._handle_copy_password(
                    this.curr_credential.url,
                    this.curr_credential.username,
                  )
                }
                titleStyle={{fontSize: 14}}
                title="Copy Password"
                rightIcon={{
                  name: 'ios-key',
                  type: 'ionicon',
                  size: 20,
                  color: '#cba830',
                }}
              />
              <ListItem
                onPress={() => this._handle_navigate_view()}
                titleStyle={{fontSize: 14}}
                title="View Account"
                rightIcon={{
                  name: 'ios-eye',
                  type: 'ionicon',
                  size: 20,
                  color: '#cba830',
                }}
              />
              <ListItem
                onPress={() => this._handle_navigate_edit()}
                titleStyle={{fontSize: 14}}
                title="Edit Account"
                rightIcon={{
                  name: 'ios-settings',
                  type: 'ionicon',
                  size: 20,
                  color: '#cba830',
                }}
              />
              <ListItem
                onPress={() => this._handle_delete_alert()}
                titleStyle={{fontSize: 14}}
                title="Delete Account"
                rightIcon={{
                  name: 'ios-remove-circle',
                  type: 'ionicon',
                  size: 20,
                  color: '#cba830',
                }}
              />
            </View>
          </RBSheet>
        </View>
      </Container>
    );
  }
}
