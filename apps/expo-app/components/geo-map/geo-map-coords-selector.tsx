import React, { Component } from "react";
import { StyleSheet, View } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { MapView } from "./maplibre/map-view";
import type { GeoMapProps } from "./types";

// Will be null for most users (only Mapbox authenticates this way).
// Required on Android. See Android installation notes.
MapLibreGL.setAccessToken(null);

// const styles = StyleSheet.create({
// 	page: {
// 		flex: 1,
// 		justifyContent: "center",
// 		alignItems: "center",
// 		backgroundColor: "#F5FCFF",
// 	},
// 	map: {
// 		flex: 1,
// 		alignSelf: "stretch",
// 	},
// });

export default function GeoMap(props: GeoMapProps) {
	return (
		<View className="h-full w-full flex-1 items-center justify-center bg-slate-100">
			<MapView
				className="flex-1 self-stretch"
				logoEnabled={false}
				styleURL="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
			/>
		</View>
	);
}
