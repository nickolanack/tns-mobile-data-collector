"use strict";



var imageModule;
var imageSource;
var permissions;
var application;
var mapsModule;


var _isArray = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Array]";
}
var _isObject = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Object]";
}

function MapViewRenderer() {


	imageModule = require("ui/image");
	imageSource = require("image-source");
	permissions = require("nativescript-permissions");
	application = require("application");

	try{
		mapsModule = require("nativescript-google-maps-sdk");
	}catch(e){
		
	}

	var me = this;

	/**
	 * Render simple items, fields, buttons etc.
	 */
	me._renderer = require('../').ViewRenderer.SharedInstance();;
}


var extend = function(a, b) {

	b = b || {};
	Object.keys(b).forEach(function(k) {
		a[k] = b[k];
	});

	return a;
}


MapViewRenderer.prototype._setMapState = function(state) {
	var me=this;
	state=JSON.parse(JSON.stringify(state));
	Object.keys(state).forEach(function(k){
		me._renderer._model.set(k, state[k]);
	})
	
}


MapViewRenderer.prototype.renderMap = function(container, field) {

	var me=this;



	
	var map=new (mapsModule.MapView)();
	container.addChild(map);

	var state={
		"hasActiveFeature":false,
		"feature":false,
		"center":[field.center[0],field.center[1], field.zoom]
	};

	me._setMapState(state);
	var fieldName=field.name||"map";


	map.on("mapReady",function(event){
		me._onMapReady(map, field);
	});

	map.on("markerSelect", function(event){

		me._setMapState({
			"feature":{
				"type":"marker",
				"id":event.marker.userData.id,
				"title":event.marker.title,
				"description":event.marker.userData.description,
				"creationDate":event.marker.userData.creationDate,
				"uid": event.marker.userData.uid,
				"icon":event.marker.userData.icon,
				"userData":event.marker.userData
			}
		});

		
		me._setMapState({
			"hasActiveFeature":true,
		});

		console.log("markerSelect: "+Object.keys(event));
	});

	map.on("cameraChanged", function(event){
		console.log("cameraChanged: "+Object.keys(event)+Object.keys(event.camera));
		me._setMapState({"center":[
			event.camera.latitude, event.camera.longitude, event.camera.zoom
		]});
	});

	map.on("markerInfoWindowTapped", function(event){
		console.log("markerInfoWindowTapped: "+Object.keys(event));
	});
	map.on("shapeSelect", function(event){
		console.log("shapeSelect: "+Object.keys(event));
	});
	map.on("markerBeginDragging", function(event){
		console.log("markerBeginDragging: "+Object.keys(event));
	});
	map.on("markerEndDragging", function(event){
		console.log("markerEndDragging: "+Object.keys(event));
	});
	map.on("markerDrag", function(event){
		console.log("markerDrag: "+Object.keys(event));
	});


	map.on("coordinateTapped", function(event){
		console.log("coordinateTapped: "+Object.keys(event)+' '+(event.position));

		me._setMapState({
			"hasActiveFeature":false,
			"feature":false
		});
	});
	map.on("coordinateLongPress", function(event){
		console.log("coordinateLongPress: "+Object.keys(event));
	});
	map.on("myLocationTapped", function(event){
		console.log("myLocationTapped: "+Object.keys(event));
	});



}





var getConfiguration=function(){
	 return require('tns-mobile-data-collector').Configuration.SharedInstance();
}



function requestPermissions() {
  return new Promise(function(resolve, reject) {
    if (!application.android) return resolve(true);
    permissions.requestPermission([
          android.Manifest.permission.ACCESS_FINE_LOCATION
         /* android.Manifest.permission.ACCESS_COARSE_LOCATION*/],
        "This demo will stink without these...")
        .then(function (result) {
          console.log("Permissions granted!");
          resolve(true);
        })
        .catch(function (result) {
          console.log("Permissions failed :( "+ JSON.stringify(result))+")";
          resolve(false);
        });

  });
}


MapViewRenderer.prototype._resolveLayer = function(layer) {
	var me=this;
	if(typeof layer=='string'||typeof layer=='number'||_isObject(layer)){
		var args=[layer];
		var promise = me._renderer._getListViewRenderer()._listResolvers['layer'].apply(null, args);
		return promise;
	}

	return new Promise(function(resolve){
		resolve(list);
	});
}

MapViewRenderer.prototype.loadLayers=function(mapView, field){

	var me=this;
	var layers=field.layers||getConfiguration().get('layers', function(){
		return [getConfiguration().get('layer')];
	});

	if(typeof layers=="string"&&layers.indexOf('{')===0){
		layers=me._renderer._parse(layers);
	}

	console.log('Render Layers: '+JSON.stringify(layers));

	layers.forEach(function(l){

		if(typeof l=="string"&&l.indexOf('{')===0){
			l=me._renderer._parse(l);
		}

		me._resolveLayer(l).then(function(list){
			list.forEach(function(item){

				getConfiguration().getImage(item.icon, item.icon).then(function(iconPath){

				 console.log("Render Feature: "+JSON.stringify(item, null, '   '));

				 var marker = new mapsModule.Marker();
				 marker.position = mapsModule.Position.positionFromLatLng(item.coordinates[0],item.coordinates[1]);
				 marker.title = item.name;
				 //marker.snippet = item.description;
				 
				 marker.userData = extend({
				 	icon:iconPath
				 },item);

				 
				 var image=new imageModule.Image();
				 image.imageSource=imageSource.fromFile(iconPath);
				 marker.icon=image;
				
			
				 mapView.addMarker(marker);			

				 console.log('Done'); 
				 	
				 }).catch(function(e){
				 	console.error('Failed to get image: '+iconPath+": "+e);
				 	console.error('Error: '+e);
				 });

			});

		}).catch(function(e){
			console.trace();
			console.log('Error: '+e);
		});

	});

	
};

MapViewRenderer.prototype._onMapReady=function(mapView, field) {
	console.log('On Map Ready');
	var me=this;

	mapView.latitude=field.center[0]; 
	mapView.longitude=field.center[1];
	mapView.zoom=field.zoom;	

	requestPermissions()
    .then(function(granted) {
        if(granted) {
            console.log("Enabling My Location..");
            mapView.myLocationEnabled = true;
            mapView.settings.myLocationButtonEnabled = true;
            return;
        }
        console.log('Location not granted');
    });


	mapView.settings.indoorLevelPickerEnabled = true;

	mapView.settings.compassEnabled = true;
	mapView.settings.mapToolbarEnabled = true;

	mapView.settings.rotateGesturesEnabled = true;
	mapView.settings.scrollGesturesEnabled = true;
	mapView.settings.tiltGesturesEnabled = true;

	mapView.settings.zoomControlsEnabled = true;
	mapView.settings.zoomGesturesEnabled = true;

	
	me.loadLayers(mapView, field);


}






module.exports = MapViewRenderer;