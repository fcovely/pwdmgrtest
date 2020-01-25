import React, {Component} from 'react';
import {View, FlatList, Keyboard, Image, ImageBackground, StatusBar, Dimensions} from 'react-native';
import {Container, Text, Button, Header, Left, Body, Right, Title, InputGroup, Input, Content} from 'native-base';
import Icon from 'react-native-vector-icons/dist/Ionicons';
import {ListItem} from 'react-native-elements';
import { EventRegister } from 'react-native-event-listeners';

var deviceWidth = Dimensions.get("window").width;
var s = require('../css/styles');

type Props = {};
export default class Add_Staging extends Component<Props> {
    
    items = [
		{name: 'Disney+ ', avatar_url: require('../assets/us_website/disney.png'), url: 'disneyplus.com'},
		{name: 'Tik Tok ', avatar_url: require('../assets/us_website/tiktok.png'), url: 'tiktok.com'},
		{name: 'Instagram ', avatar_url: require('../assets/us_website/Instagram_AppIcon_Aug2017.png'), url: 'instagram.com'},
		{name: 'Gmail ', avatar_url: require('../assets/us_website/Gmail_Icon.png'), url: 'google.com'},
		{name: 'Facebook ', avatar_url: require('../assets/website/facebook.png'), url: 'facebook.com'},
		{name: 'Snapchat ', avatar_url: require('../assets/us_website/Snapchat.jpg'), url: 'snapchat.com'},
		{name: 'Netflix ', avatar_url: require('../assets/website/netflix.png'), url: 'netflix.com'},
		{name: 'Hulu ', avatar_url: require('../assets/us_website/hulu.jpg'), url: 'hulu.com'},
		{name: 'Spotify ', avatar_url: require('../assets/us_website/Spotify.jpg'), url: 'spotify.com'},
		{name: 'Amazon', avatar_url: require('../assets/us_website/amazone.png'), url: 'amazon.com'},
		{name: 'Walmart ', avatar_url: require('../assets/us_website/Walmart.png'), url: 'walmart.com'},
		{name: 'Wish ', avatar_url: require('../assets/us_website/Wish.png'), url: 'wish.com'},
		{name: 'Venmo ', avatar_url: require('../assets/us_website/Venmo.jpg'), url: 'venmo.com'},
		{name: 'Uber ', avatar_url: require('../assets/us_website/uber.jpg'), url: 'uber.com'},
		{name: 'Twitter ', avatar_url: require('../assets/website/twitter.png'), url: 'twitter.com'},
		{name: 'PayPal ', avatar_url: require('../assets/us_website/paypal.jpg'), url: 'paypal.com'},
		{name: 'Lyft ', avatar_url: require('../assets/us_website/Lyft.png'), url: 'lyft.com'},
		{name: 'Reddit ', avatar_url: require('../assets/us_website/Reddit.png'), url: 'reddit.com'},
		{name: 'Microsoft ', avatar_url: require('../assets/us_website/microsoft_outlook.png'), url: 'live.com'},
		{name: 'Kickstarter ', avatar_url: require('../assets/us_website/Kickstarter.png'), url: ' kickstarter.com'},
		{name: 'Yahoo Mail ', avatar_url: require('../assets/us_website/Yahoo.png'), url: 'yahoo.com'},
		{name: 'Dropbox ', avatar_url: require('../assets/us_website/dropbox.png'), url: 'dropbox.com'},
	];
    
    constructor(props) {
        super(props);

		const { navigation } = this.props;
        global.website = [];
        this.state = {
        	isSearch: false, 
        	value: "",
        	item_list: this.items,
        	connected: global.state.state.curr_device.connected
        };
    }

    componentDidMount(){
    	this._subsribe_device_status_listener();
    	this._focus_listener();
    }
    
    componentWillUnmount(){
        EventRegister.removeEventListener(this.device_status_listener);
    	if(this.did_focus_screen != null) this.did_focus_screen.remove();
    }
    
    _focus_listener = () => {
		if(this.did_focus_screen != null) this.did_focus_screen.remove();
    	const { navigation } = this.props;
		this.did_focus_screen = navigation.addListener('didFocus', () => {
			this.setState({
				connected: global.state.state.curr_device.connected
			})
		});
    }
    
    _subsribe_device_status_listener = () => {
		if(this.device_status_listener != null) EventRegister.removeEventListener(this.device_status_listener);
		this.device_status_listener = EventRegister.addEventListener('DEVICE_STATUS', (status) => {
            this.setState({ connected: status });
        })
	}
    
    _on_search_text = (text) => {
        const newData = this.items.filter(item => {
            const name = `${item.name.toLowerCase()}`;
            const textData = text.toLowerCase();
            return name.indexOf(textData) > -1;
        });

        this.setState({ value: text, item_list: newData, isSearch: true });
        if (text === "") {
            this.setState({ item_list: this.items })
        }
    };

    _handle_clear_text = () =>{
        this.setState({ value: "", item_list: this.items, isSearch: false});
        Keyboard.dismiss()
    };

	 /*
	============================================================================================================
	========================================= NAVIGATE =========================================================
	============================================================================================================
	*/
	_handle_custom_websites = () => {
		const { navigate } = this.props.navigation;
		navigate("Add_Account_Screen", { url: "" });
	}
	
	_handle_suggested_websites = (item) => {
		const { navigate } = this.props.navigation;
		navigate("Add_Account_Screen", { url: item.url });
    };
	
	_handle_navigate_vault = () => {
		const { navigate } = this.props.navigation;
		navigate("Vault_Screen");
	}
	
	_handle_navigate_settings = () => {
		const { navigate } = this.props.navigation;
		navigate("Settings_Screen");
	}
    
    _handle_open_bottom_sheets_device = () => {
    	global.bottom_sheets_device.open();
    }
    
    render() {
        return (
            <Container>
                <Header style={{backgroundColor: "#cba830"}}>
                    <StatusBar backgroundColor='#d7b43e' barStyle="light-content"/>
                    <Left style={{flex: 3, marginLeft: 8}}><Button onPress={() => {this._handle_navigate_vault();}} transparent><Text style={{color: 'black'}}>Back</Text></Button></Left>
                    <Body style={{flex: 3}}><Title style={{color: 'black'}}>Vault</Title></Body>
                    <Right style={{flex: 3}}></Right>
                </Header>
				
                <View style={[s.container]}>
                	<View style={{flex: 1, width: '100%'}}>
						<Button onPress={() => this._handle_open_bottom_sheets_device()} full style={[s.eth_btn_full, s.bg_black, {backgroundColor: 'black', height: 60}]} >
							<View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
								<Icon name={'ios-radio-button-on'} color={this.state.connected ? "#ADFF2F" : "red"} style={{marginLeft: 15}} size={30}/>
								<Text style={{color: 'white', fontWeight: 'bold'}}>{global.state.state.curr_device.name}</Text>
								<Icon style={{marginRight: 18, position: 'absolute', right: 0}} name={'ios-settings'} color="white" size={20}/>
							</View>
						</Button>
			
						<View searchBar style={{flexDirection: 'row', padding:15,backgroundColor: 'black'}}>
							<InputGroup rounded style={{flex:1, backgroundColor:'#fff',height:35, paddingLeft:10, paddingRight:10}}>
								<Icon name="ios-search" size={20}/>
								<Input onChangeText={(text) => this._on_search_text(text)} placeholder="Search"  style={{paddingBottom: 4, marginLeft: 10}}
									   autoCorrect={false} value={this.state.value} returnKeyType={'done'} clearButtonMode={'always'}/>
							</InputGroup>
							<Button transparent style={{height:30, display: this.state.isSearch ? 'flex': 'none'}} onPress={() => this._handle_clear_text()}>
								<Text style={{color: 'white'}}>Cancel</Text>
							</Button>
						</View>
						
						<View style={{backgroundColor: 'white'}}>
							<Button onPress={() => {this._handle_custom_websites()}} transparent full style={[{marginTop: 1, borderBottomColor: 'lightgray', borderBottomWidth: 1, backgroundColor: 'white'}, s.container_header_title]} >
								<View style={{width:'85%'}}>
									<Text style={{marginTop:13, marginLeft: -25, color:"black"}}>
										Add using custom website
									</Text>
								</View>
							</Button>
						</View>

						<FlatList style={{backgroundColor: 'white'}}
							data={this.state.item_list}
							renderItem={({item}) => (
								<ListItem
									roundAvatar
									title={item.name}
									leftAvatar={{source: item.avatar_url}}
									bottomDivider
									onPress={() => {this._handle_suggested_websites(item)}}
								>
								</ListItem>
							)}
							keyExtractor={(item, index) => index.toString()}
						/>
					</View>
                </View>
            </Container>
        );
    }
}

/*
<View>
	<Button full style={[{backgroundColor: '#cba830'}, s.container_header_title]} onPress={() => {this._handle_navigate_vault();}}>
		<View style={{width: "10%",justifyContent: 'center', alignItems: 'center'}}>
			<Icon name='ios-arrow-back' size={25} color="black" style={{justifyContent: 'center',alignItems: 'center'}}/>
		</View>
		<View style={{width: "90%",justifyContent:'center', alignItems: 'center'}}>
			<Text style={{color: 'black', textAlign:'center', marginRight: deviceWidth*(10/100)}}>Back</Text>
		</View>
	</Button>
</View>

this.items = [
	{name: 'Facebook', avatar_url: require('../../assets/website/facebook.png'), url: 'facebook.com'},
	{name: 'Line', avatar_url: require('../../assets/website/line.png'), url: 'line.com'},
	{name: 'Instagram ', avatar_url: require('../../assets/us_website/Instagram_AppIcon_Aug2017.png'), url: 'instagram.com'},
	{name: 'Tik Tok ', avatar_url: require('../../assets/us_website/tiktok.png'), url: 'tiktok.com'},
	{name: 'Gmail ', avatar_url: require('../../assets/us_website/Gmail_Icon.png'), url: 'google.com'},
	{name: 'Amazon', avatar_url: require('../../assets/website/amazon.png'), url: 'amazon.com'},
	{name: 'Linkedin', avatar_url: require('../../assets/website/linkedin.png'), url: 'linkedin.com'},
	{name: 'Netflix', avatar_url: require('../../assets/website/netflix.png'), url: 'netflix.com'},
	{name: 'Twitter', avatar_url: require('../../assets/website/twitter.png'), url: 'twitter.com'},
	{name: 'Youtube', avatar_url: require('../../assets/website/youtube.png'), url: 'youtube.com'},
];
*/
