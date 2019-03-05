"use strict";



var _isArray = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Array]";
}

var _extend = function(a, b) {

	b = b || {};
	Object.keys(b).forEach(function(k) {
		a[k] = b[k];
	});

	return a;
}

function ImageResolver(){



}



ImageResolver.prototype._isImageAsset = function(asset) {

	if (asset && (typeof asset) != "string") {
		console.log('is image asset')
		return true;
	} else {
		return false;
	}
}

ImageResolver.prototype._imageFromLocalFileAsset=function(url){
	var filepath = url;
	var fs = require("file-system");

	if (filepath.indexOf('/') < 0) {
		var savepath = fs.knownFolders.documents().path;
		filepath = fs.path.join(savepath, url);
	}



	if(fs.File.exists(filepath)){
		var imageModule = require("ui/image");
		var image = new imageModule.Image();
		console.log('Set Image From Asset ' + url);
		image.src = filepath;
		return image;
	}
	throw 'file does not exist locally';
}

ImageResolver.prototype._imageFromImageAsset = function(asset) {
	var imageModule = require("ui/image");
	var image = new imageModule.Image();
	console.log('Set Image From Asset ' + asset);
	image.src = asset;
	return image;
}

ImageResolver.prototype._isLocalFileAsset = function(asset) {
	if (typeof asset == "string") {
		var filepath = asset;
		var fs = require("file-system");

		if (filepath.indexOf('/') < 0) {
			var savepath = fs.knownFolders.documents().path;
			filepath = fs.path.join(savepath, asset);
		}

		return fs.File.exists(filepath);
	}
	return false;
}

ImageResolver.prototype._client = function() {
	return require('../').CoreClient.SharedInstance();
}

ImageResolver.prototype._setCachedImageAsync = function(url, image) {
	var me=this;

	//console.log('Set View Image Async: ' + url);
	//var startTime = (new Date()).valueOf()
	if(url.indexOf(me._client().getProtocol() + '://') === 0){

		var config=me._config();
		var hasImage=config.hasCachedImage(url);


		//var traceError = new Error('de-anonymize');

		setTimeout(function(){
			config.getImage(url, url).then(function(path){

				console.log('_setCachedImageAsync image: '+path);
				image.src=path;
				//console.log('Image Async: '+((new Date()).valueOf()-startTime)+"ms "+path);

			}).catch(function(err){
				//console.error(err.trace);
				//console.error(traceError.stack);
				console.error('Error caching url: '+JSON.stringify(err)+' '+url);
			});
		}, 250);
		

		if(hasImage){
			return config.cachedImagePath(url);
		}

		var _thumb128=me._getImageThumb(url, {size:{w:128, h:128}});
		if(config.hasCachedImage(_thumb128)){
			return config.cachedImagePath(_thumb128);
		}else{
			config.getImage(_thumb128, _thumb128);
		}

		// var _thumb32=me._getImageThumb(url, {size:{w:32, h:32}});
		// if(config.hasCachedImage(_thumb32)){
		// 	return config.cachedImagePath(_thumb32);
		// }


	}else{
		image.src=url;
	}
	return url;
}

ImageResolver.prototype._getImageThumb = function(url, field) {

	var me=this;
	

	if(field.size&&url.indexOf(me._client().getProtocol() + '://') === 0){


		var size=_extend({w:32, h:32}, field.size);
		return url.split('?')[0] + '?thumb=' + size.w + 'x' + size.h;


	}

	return url;


}

ImageResolver.prototype._config = function() {
	return require('../').Configuration.SharedInstance();
}


ImageResolver.prototype.setParser = function(fn) {
	var me=this;
	me._parse=fn;

	return me;
}

ImageResolver.prototype.createImageIcon=function(url){
	var me=this;
	return me.createImage(url);

}


ImageResolver.prototype.createImage = function(field) {

	var me = this;

	var url = field;
	if (field.image) {
		url = field.image;
	}



	if (typeof url == 'function') {
		url = url();
	}

	if (_isArray(url) && url.length == 1 && typeof url[0] == "string") {
		url = url[0];
	}

	if (me._isImageAsset(url)) {
		return me._imageFromImageAsset(url);
	}

	if (typeof url == 'string' && url.indexOf('{') >= 0) {

		if(typeof me._parse!="function"){
			throw 'Requires setParser';
		}

		var before=url;
		url = me._parse(url);
		console.log('Variable Image: ' +before+"=>"+ url);


	}

	if (_isArray(url) && url.length == 1 && typeof url[0] == "string") {
		/**
		 * support for using core-app imageset image which is always an array with image url at 0 (possibly multiple images...);
		 * @type {[type]}
		 */
		url = url[0];
	}

	if (me._isLocalFileAsset(url)) {
		console.log('Local File Asset: '+url);
		return me._imageFromLocalFileAsset(url);
	}


	var src = url;

	if (typeof src != "string") {
		throw 'Expected image src to be a string ' + src + (typeof src);
	}



	if (src[0] !== "~"&&src.indexOf('http')!==0) {
		src = global.client.getProtocol() + '://' + global.client.getUrl() + "/" + src;
	}



	
	src = me._getImageThumb(src, field);

	




	var imageModule = require("ui/image");
	var image = new imageModule.Image();
	image.loadMode="async";
	//image.src = encodeURI(src);

	me._setCachedImageAsync(src, image);

	return image;

}

module.exports = ImageResolver;