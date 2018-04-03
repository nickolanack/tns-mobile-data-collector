"use strict";

var ImageCache;
var ImageSource;
var fs;


var configurationName;


var _isArray = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Array]";
}


var saveImage = function(name, imgSource) {


	var path = imagePath(name);
	var saved = imgSource.saveToFile(path, "png");
	if (!saved) {
		throw 'Failed to save image: ' + name + ' at path: ' + path;
	}
	return path;
}



var imagePath = function(name) {

	if(typeof name !="string"){
		throw 'Invalid imagePath name: '+(typeof name)+" "+JSON.stringify(name);
	}

	name=name.split('/').join('.'); // .split('[').join('_').split(']').join('_');

	var folder = fs.knownFolders.temp();
	var path = fs.path.join(folder.path, name + ".png");

	return path;
}

var hasImage = function(name) {
	return fs.File.exists(imagePath(name));
}


var saveStyle = function(name, styleString) {
	var path = stylePath(name);
	var file = fs.File.fromPath(path);

	return file.writeText(styleString);

}



var stylePath = function(name) {

	var folder = fs.knownFolders.temp();
	var path = fs.path.join(folder.path, name + ".css");

	return path;
}

var hasStyle = function(name) {
	return fs.File.exists(stylePath(name));
}

var readStyle = function(name) {


	var path = stylePath(name);
	var file = fs.File.fromPath(path);
	return file.readText();
}

var configPath = function(name) {

	var folder = fs.knownFolders.temp();
	var path = fs.path.join(folder.path, global.parameters.domain + '.' + name + ".json");

	return path;
}

var hasConfig = function(name) {
	return fs.File.exists(configPath(name));
}

var saveConfig = function(name, json) {


	var path = configPath(name);
	var file = fs.File.fromPath(path);
	console.log('Saved Config: ' + name + ": " + path + " => " + JSON.stringify(json, null, '  '));// .substring(0, 50) + '...');
	return file.writeText(JSON.stringify(json));

}
var readPath = function(name) {


	var path = configPath(name);
	var file = fs.File.fromPath(path);
	console.log('Read Config: ' + name + ": " + path + " => " + file.lastModified);
	return file.readText();
}



var instance;

function Configuration(client) {

	var me=this;

	ImageCache = require("ui/image-cache").Cache;
	ImageSource = require("image-source");
	fs = require("file-system");

	var Template=require('../').Template;

	me._template=new Template();
	if(!me._template.render){
		throw "Expected Template.render";
	}

	


	configurationName = global.parameters.configuration;
	var me = this;
	me.client = client;
	me._refreshCacheItems = true; //use cached items if available
	me._defaultConfig = false;
	me._configs = {};


	me._refreshDate=(new Date()).valueOf();

	if(instance){
        throw 'Singleton class instance has already been created! use Configuration.SharedInstance()';
    }
    instance=me;

};


Configuration.SharedInstance=function(){
    if(!instance){
        throw 'Singleton class requires instantiation';
    }
    return instance;
}

Configuration.prototype.hasCachedImage = function(name) {
	return hasImage(name);
}

Configuration.prototype.cachedImagePath = function(name) {
	return imagePath(name);
}

Configuration.prototype.hasConfiguration = function(name) {
	return hasConfig(name);
}
Configuration.prototype.hasConfigurationResources = function(name) {
	return true;
}

Configuration.prototype.refreshCacheItems = function() {
	var me = this;
	me._refreshCacheItems = true;
}


Configuration.prototype.getDefaultName = function() {
	return global.parameters.configuration;
}

Configuration.prototype.prepareDefaultConfig = function(obj) {


	var config = {
		parameters: {}
	};
	Object.keys(global.parameters).forEach(function(k) {
		config.parameters[k] = global.parameters[k];
	});
	Object.keys(obj.parameters).forEach(function(k) {
		config.parameters[k] = obj.parameters[k];
	});

	return config;
};

Configuration.prototype.getConfiguration = function(name) {

	//TODO deprecated. this is a fix for a small server bug where ',' gets appended to names
	name = name.replace(',', '');

	var me = this;

	return new Promise(function(resolve, reject) {

		if (me._configs[name]) {
			resolve(me._configs[name]);
			return;
		}



		var resolveLocalConfig = function() {

			console.log('Read Configuration: ' + name);

			readPath(name).then(function(string) {
				console.log('Successfully read config: ' + name);
				var config = JSON.parse(string);
				if (!me._defaultConfig) {
					config = me.prepareDefaultConfig(config);
					me._defaultConfig = config;
				}else{
					me._defaultConfig.parameters[name]=config.parameters;
				}
				me._configs[name] = config;

				me.getIncludes(config);

				resolve(config);

			}).catch(function(e) {
				console.log('Failed to read config: ' + name + ': ' + e);
				reject(e);
			});
		}

		if (!me._refreshCacheItem(name)) {
			resolveLocalConfig();
			return;
		}

		console.log('Downloading Configuration: ' + name);
		me.client.getConfiguration(name).then(function(config) {

			if (!me._defaultConfig) {
				config = me.prepareDefaultConfig(config);
				me._defaultConfig = config;
			}else{
				me._defaultConfig.parameters[name]=config.parameters;
			}
			me._configs[name] = config;

			me.getIncludes(config);

			saveConfig(name, config).then(function() {

			}).catch(function(e) {
				console.log('Failed to save config: ' + name + ': ' + e);
			});

			resolve(config);

		}).catch(function(e) {

			if (hasConfig(name)) {

				resolveLocalConfig();
				return;
			}

			reject(e);

		});


	});

}

Configuration.prototype._refreshCacheItem = function(name) {
	var me=this;
	return (!hasConfig(name)) || (me._refreshCacheItems&&me.getLocalDataModifiedDate(name)<me._refreshDate);

}

Configuration.prototype.extendDefaultParameters = function(data) {

	var me=this;

	if (!me._defaultConfig) {
		throw 'Configuration not set';
	}


	Object.keys(data).forEach(function(k) {
		me._defaultConfig.parameters[k]=data[k];
	});

}


Configuration.prototype.getIncludes = function(config) {
	var me = this;
	if (config.parameters.includes) {
		config.parameters.includes.forEach(function(name) {
			if (name && name !== "") {
				me.getConfiguration(name);
			}
		});
	}
}

Configuration.prototype.getLocalDataModifiedDate = function(name) {
	if (hasConfig(name)) {
		var path = configPath(name);
		var file = fs.File.fromPath(path);
		return file.lastModified;
	}
	return false;
}

Configuration.prototype.getLocalData = function(name, defaultValue) {

	var me = this;

	console.log('Get Local Data');

	return new Promise(function(resolve, reject) {

		if (hasConfig(name)) {
			readPath(name).then(function(string) {
				console.log('Successfully read data: ' + name + " " + configPath(name) + ":  " + string);
				var config = JSON.parse(string);
				resolve(config);
			}).catch(function(e) {
				console.log('Failed to read data: ' + name + ': ' + e);
				reject(e);
			});
			return;
		}
		console.log('Does not have: ' + configPath(name));
		console.log('Use default data: ' + name);
		resolve(defaultValue);

	});

}


Configuration.prototype.setLocalData = function(name, data) {

	console.log('Store Local Data: ' + name + ":  " + JSON.stringify(data) + " " + configPath(name));
	return saveConfig(name, data);

}


/**
 * recurisively move through an object from a path string. ie: _get("name.value",{name:{value:"some value"}}) returns "some value"
 */
Configuration.prototype._get = function(path, config) {
	var me = this;
	var parts=path.split('.');
	var name=parts[0];


	if (typeof config[name] != 'undefined') {
		var value= config[name];
		if(parts.length>1){
			return me._get(parts.slice(1).join('.'), value);
		}
		return value;
	}


	//console.log("_get_ config: " + path + " does not exist in: "+JSON.stringify(config, null, '  '));

	return null;



}

Configuration.prototype.getDefaultParameters = function() {

	var me=this;

	if (!me._defaultConfig) {
		throw 'Configuration not set';
	}

	return me._defaultConfig.parameters;

}

Configuration.prototype.get = function(name, defaultValue) {
	var me = this;

	if (!me._defaultConfig) {
		throw 'Configuration not set';
	}


	var value=me._get(name, me._defaultConfig.parameters);
	if (value!==null) {
		return me._template.render(value, me.getDefaultParameters());

	}

	if (typeof defaultValue != 'undefined') {

		if(typeof defaultValue=='function'){
			defaultValue=defaultValue();
		}

		console.log("get config: " + name + " does not exist: using default: "+JSON.stringify(defaultValue, null, '  '));
		return me._template.render(defaultValue, me.getDefaultParameters());

	}

	throw ('Undefined config parameter: ' + name);



}
Configuration.prototype.getIcon = function(name, urlPath) {

	var me = this;

	
	if(_isArray(name)&&typeof name[0]=='string'){
		name=name[0];
	}


	var getLocalIconPromise = function() {
		var path = imagePath(name);
		console.log('File exists: ' + path);
		return new Promise(function(resolve, reject) {
			resolve(path);
		});
	}


	if (!me._refreshCacheItem(name)) {
		return getLocalIconPromise();
	}



	return new Promise(function(resolve, reject) {

		if (!urlPath) {

			urlPath = me.get(name, name);

		}


		//console.log('Requesting cacheable image: '+name+' '+urlPath);

		if (!urlPath) {
			throw "Empty url";
		}

		var url = me._formatUrl(urlPath) + "?thumb=128x128";
		if(url.indexOf('http')!==0){
			url=me.client.getProtocol()+"://" + me.client.getUrl() + '/' + url;
		}

		// Try to read the image from the cache

		console.log('Requesting icon: ' + url);
		ImageSource.fromUrl(url).then(function(imgSource) {

			//console.log('Retrieved image: '+JSON.stringify(imgSource));
			resolve(saveImage(name, imgSource));



		}).catch(function(error) {

			if (hasImage(name)) {
				getLocalIconPromise().then(function(thing) {
					resolve(thing);
				}).catch(function(e) {
					reject(e);
				})
				return;
			}

			reject(error);
		});

	});

};



Configuration.prototype.getImage = function(name, urlPath) {

	var me = this;


	var getLocalImagePromise = function() {
		var path = imagePath(name);
		console.log('File exists: ' + path);
		return new Promise(function(resolve, reject) {
			resolve(path);
		});
	}

	if (!me._refreshCacheItem(name)) {
		return getLocalImagePromise();
	}



	return new Promise(function(resolve, reject) {

		if (!urlPath) {

			urlPath = me.get(name);

		}


		//console.log('Requesting cacheable image: '+name+' '+urlPath);

		if (!urlPath) {
			throw "Empty url";
		}


		var url = me._formatUrl(urlPath);
		if(url.indexOf('http')!==0){
			url=me.client.getProtocol()+"://" + me.client.getUrl() + '/' + url;
		}
		// Try to read the image from the cache

		console.log('Requesting image:'+name+' url: ' + url);
		ImageSource.fromUrl(url).then(function(imgSource) {

			//console.log('Retrieved image: '+JSON.stringify(imgSource));
			resolve(saveImage(name, imgSource));



		}).catch(function(error) {

			console.log("ImageSource.fromUrl Error: "+url+": "+error);

			if (hasImage(name)) {
				console.log('Failed to load image: ' + name + ' but found local copy');
				getLocalImagePromise().then(function(thing) {
					resolve(thing);
				}).catch(reject)
				return;
			}

			reject(error);
		});

	});

};

Configuration.prototype._formatUrl=function(url){

	return url;  //url.split('[').join('%5B').split(']').join('%5D');

//://bcwf.geolive.ca/components/com_geolive/users_files/user_files_400/Uploads/%5BG%5D_eXv_N4u_%5BImAgE%5D_4on.png?thumb=48x48
}


Configuration.prototype.getStyle = function(name, urlPath) {

	var me = this;


	console.log("Request Style: "+name);

	var getLocalStylePromise = function() {
		var path = stylePath(name);
		return new Promise(function(resolve, reject) {
			return readPath(path);
		});
	}

	if (!me._refreshCacheItem(name)) {
		return getLocalStylePromise();
	}



	return new Promise(function(resolve, reject) {

		if (!urlPath) {

			urlPath = me.get(name);

		}



		if (!urlPath) {
			throw "Empty url";
		}


		var url =me._formatUrl(urlPath);
		if(url.indexOf('http')!==0){
			 url=me.client.getProtocol()+"://" + me.client.getUrl() + '/' + url;
		}
		// Try to read the stylesheet from the cache
		console.log("stylesheet: " + url);
		fetch(url)
			.then(function(response) {
				return response.text();
			})
			.then(function(text) {
				console.log(text);
				saveStyle(name, text);
				resolve(stylePath(name));
			})
			.catch(function(err) {

				if (hasStyle(name)) {
					getLocalStylePromise().then(function(thing) {
						resolve(thing);
					}).catch(function(e) {
						reject(e);
					})
					return;
				}

				reject(err)
			});

	});

};






module.exports = Configuration;