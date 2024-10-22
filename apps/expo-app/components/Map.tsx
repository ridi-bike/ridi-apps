import React, { Component } from "react";
import { StyleSheet, View } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";

// Will be null for most users (only Mapbox authenticates this way).
// Required on Android. See Android installation notes.
MapLibreGL.setAccessToken(null);
// MapLibreGL.setConnected(true);
const styles = StyleSheet.create({
	page: {
		flex: 1,
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#F5FCFF",
	},
	map: {
		flex: 1,
		alignSelf: "stretch",
	},
});

export class MapsMaps extends Component {
	render() {
		return (
			<View style={styles.page}>
				<MapLibreGL.MapView
					style={styles.map}
					logoEnabled={false}
					styleURL="https://demotiles.maplibre.org/style.json"
				/>
			</View>
		);
	}
}

// import React from "react";
// import { StyleSheet, View } from "react-native";
// import Mapbox from "@rnmapbox/maps";
//
// Mapbox.setAccessToken(
// 	"pk.eyJ1IjoidG9tc2phbnNvbnMiLCJhIjoiY20ya2lwNmNrMDFtZzJxcXlvaTJqNzN0eSJ9.BM-1TkuejUWH03wiF4NpHw",
// );
//
// export const MapsMaps = () => {
// 	return (
// 		<View style={styles.page}>
// 			<View style={styles.container}>
// 				<Mapbox.MapView style={styles.map} />
// 			</View>
// 		</View>
// 	);
// };
//
// const styles = StyleSheet.create({
// 	page: {
// 		flex: 1,
// 		justifyContent: "center",
// 		alignItems: "center",
// 	},
// 	container: {
// 		height: 300,
// 		width: 300,
// 	},
// 	map: {
// 		flex: 1,
// 	},
// });
