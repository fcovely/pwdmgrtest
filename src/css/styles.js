import{ StyleSheet, Dimensions} from 'react-native';
const screenWidth = Math.round(Dimensions.get('window').width);
const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},

	container_footer:{
		position: 'absolute',
		bottom: 0,
	},

	container_header_title:{
		flexDirection: 'row',
		alignItems: 'stretch',
		paddingTop: 5,
		paddingBottom: 5,
		height: 55,
	},

    container_switch_mode:{
        flexDirection: 'row',
        alignItems: 'stretch',
        height: 55,
		paddingTop: 3
    },

	bg_black:{
		backgroundColor: 'black'
	},

	container_header_title_text:{
		color: 'white',
		textAlign: 'left',
	},

	container_list: {
		flex: 1,
		position: 'absolute',
		width: "100%",
		height: "100%",
		top: 0,
	},

	container_list2:{
		width: "100%",
		height: "100%",
	},

	header: {
		fontSize: 20,
		textAlign: 'center',
		margin: 10,
	},

	content: {
		textAlign: 'center',
		color: '#333333',
		marginBottom: 5,
	},

	buttons: {
		position: 'absolute',
		alignSelf: 'flex-end',
		paddingRight: 15,
		marginTop: 25
	},


	items:{
		zIndex: 10,
		position: 'relative',
		alignSelf: 'center',
		textAlign: 'center'
	},

	webview:{
		position: 'absolute',
		marginTop: 100
	},
    imageStyle: {
        flex: 9,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'white'
    },
    imageStyle1: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white'
    },

    alertStyle: {
        flex: 1, marginLeft: 20, marginTop: 1,flexDirection: 'row',justifyContent: 'center',alignItems: 'stretch',
        borderBottomWidth :1, borderBottomColor: '#1565C0'
    },
    addAccount1: {
        width: screenWidth - 30, marginRight: 2,justifyContent: 'center'
    },
    iconDiv1: {
        width: 30, alignItems: 'center', justifyContent: 'center', marginRight: 10
    },
    setting: {
        flex: 2, marginTop: 1,flexDirection: 'row',justifyContent: 'center',alignItems: 'stretch',marginLeft: 20
    },
    backgroundImage:{
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: "center",
        alignItems: "center",
        opacity: 0.8, backgroundColor: '#BDBDBD'
    },
    
    backgroundImageStag:{
        flex: 1,
        width: '100%',
        height: '100%',
       // justifyContent: "center",
       // alignItems: "center",
        opacity: 0.85,
		backgroundColor: '#BDBDBD'
    },
    scrollView: {
        paddingHorizontal: 20,
    },
    input: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderColor: '#dbdbdb',
        padding: 10,
    },
});

module.exports = styles;


/*
const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});
*/
