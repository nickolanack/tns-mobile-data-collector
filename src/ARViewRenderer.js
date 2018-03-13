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

	ar.on('arLoaded', function(){
		console.log("Loaded");
	})
	ar.on('planeTapped', function(){
		console.log("Tapped");
	})
	container.addChild(ar);

}



module.exports = ARViewRenderer;