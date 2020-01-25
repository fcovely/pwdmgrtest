import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
var s = require('./util/styles');

type Props = {};
export default class E_Info extends Component<Props> {
  render() {
    return (
      <View style={s.container}>
      	<Text style={s.header}>Ethernom, Inc.</Text>
      	<Text style={s.content}>Password Manager Mobile</Text>
      	<Text style={s.content}>V.0.1.1</Text>
      </View>
    );
  }
}
