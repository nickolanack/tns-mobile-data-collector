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



	var AR = require("nativescript-ar").AR;
	var supported = AR.isSupported();

	
	var ar=new AR();
	container.addChild(ar);

}



module.exports = ARViewRenderer;