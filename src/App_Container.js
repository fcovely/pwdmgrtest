import React, {Component} from 'react';
import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';
import {Root} from 'native-base';

import Device from './screen/Device';
import PIN_Entry from './screen/PIN_Entry';
import Vault from './screen/Vault';
import Add_Staging from './screen/Add_Staging';
import Add_Account from './screen/Add_Account';
import View_Account from './screen/View_Account';
import Edit_Account from './screen/Edit_Account';

import Settings from './screen/Settings';
import Autofill from './screen/Autofill';
import About from './screen/About';

export default class App_Container extends Component<{}> {
    constructor() {
        super();
    }
    
	render() {
		return (
			<Root>
				<AppContainer/>
			</Root>
		);
	}
}

const App_Stack = createStackNavigator({
    Device_Screen	   : {screen: Device, navigationOptions: {header: null, gesturesEnabled: false}},
    PIN_Entry_Screen   : {screen: PIN_Entry, navigationOptions: {header: null, gesturesEnabled: false}},
    Vault_Screen	   : {screen: Vault, navigationOptions: {header: null, gesturesEnabled: false}},
    Add_Staging_Screen : {screen: Add_Staging, navigationOptions: {header: null, gesturesEnabled: false},},
    Add_Account_Screen : {screen: Add_Account, navigationOptions: {header: null, gesturesEnabled: false},},
    View_Account_Screen: {screen: View_Account, navigationOptions: {header: null, gesturesEnabled: false}},
    Edit_Account_Screen: {screen: Edit_Account, navigationOptions: {header: null, gesturesEnabled: false},},
    
    Settings_Screen	   : {screen: Settings, navigationOptions: {header: null, gesturesEnabled: false}},
    Autofill_Screen	   : {screen: Autofill, navigationOptions: {header: null, gesturesEnabled: false}},
    About_Screen	   : {screen: About, navigationOptions: {header: null, gesturesEnabled: false}}
});

const DashboardStackNavigator = createStackNavigator(
    {
        App_Stack,
    },
    {
        headerMode: 'none', mode: 'modal',

    },
);

const AppContainer = createAppContainer(DashboardStackNavigator);




/*
import TutorialScreen from './container/screen/TutorialScreen';
import AdvanceScreen from './container/screen/AdvanceScreen';
*/