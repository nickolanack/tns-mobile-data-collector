"use strict";



function ARViewRenderer() {


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


ARViewRenderer.prototype.renderARView = function(container, field) {

	var Color=require('tns-core-modules/color').Color;
	var ARNodeInteraction= require("nativescript-ar").ARNodeInteraction;

	var arModule = require("nativescript-ar");
	var AR=arModule.AR;
	var supported = AR.isSupported();
	console.log('AR Supported: '+(supported?'Yes':'No'));
	


	var ar=new AR(
	// {
	// 	planeMaterial:'tron',
	// 	showStatistics:true,
	// 	detectPlanes:true,
	// 	debugLevel:'FEATURE_POINTS',
	// 	planeOpacity:0.2,
    
	// }
	);

	ar.debugLevel="FEATURE_POINTS";
    ar.detectPlanes="true";
    ar.showStatistics="true";
    ar.planeOpacity="0.2";

	ar.on('arLoaded', function(args){
		console.log(arguments);




	});


	ar.on('sceneTapped', function(){
		console.log('sceneTapped');
	});

	ar.on('planeDetected', function(){
		console.log('planeDetected');
	});



	ar.on('planeTapped', function(args){
		console.log('planeTapped');
		args.object.addModel();
	});

	container.addChild(ar);


	



}



module.exports = ARViewRenderer;