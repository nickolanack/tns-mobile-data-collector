"use strict";

var ImageCache;
var ImageSource;
var fs;


var configurationName;


var _isArray = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Array]";
}












var instance;

function Configuration(client) {

	var me = this;

	ImageCache = require("ui/image-cache").Cache;
	ImageSource = require("image-source");
	fs = require("file-system");

	var Template = require('../').Template;

	me._template = Template.SharedInstance();
	if (!me._template.render) {
		throw "Expected Template.render";
	}



	configurationName = global.parameters.configuration;
	var me = this;
	me.client = client;
	me._refreshCacheItems = true; //use cached items if available
	me._defaultConfig = false;
	me._configs = {};


	me._refreshDate = (new Date()).valueOf();

	if (instance) {
		throw 'Singleton class instance has already been created! use Configuration.SharedInstance()';
	}
	instance = me;

};


Configuration.prototype.hasImage = function(name) {
	var me=this;
	return fs.File.exists(me.imagePath(name));
}


Configuration.prototype.imagePath = function(name) {

	if (typeof name != "string") {
		throw 'Invalid imagePath name: ' + (typeof name) + " " + JSON.stringify(name);
	}

	name = name.split('/').join('.'); // .split('[').join('_').split(']').join('_');

	var folder = fs.knownFolders.temp();
	var path = fs.path.join(folder.path, name + ".png");

	return path;
}



Configuration.prototype.saveImage = function(name, imgSource) {

	var me=this;

	var path = me.imagePath(name);
	var saved = imgSource.saveToFile(path, "png");
	if (!saved) {
		throw 'Failed to save image: ' + name + ' at path: ' + path;
	}
	return path;
}


Configuration.prototype.stylePath = function(name) {

	var folder = fs.knownFolders.temp();
	var path = fs.path.join(folder.path, name + ".css");

	return path;
}



Configuration.prototype.hasStyle = function(name) {
	var me=this;
	return fs.File.exists(me.stylePath(name));
}

Configuration.prototype.saveStyle = function(name, styleString) {
	var me =this;
	var path = me.stylePath(name);
	var file = fs.File.fromPath(path);

	return file.writeText(styleString);

}


Configuration.prototype.saveConfig = function(name, json) {

	var me=this;
	var path = me.configurationPath(name);
	var file = fs.File.fromPath(path);
	console.log('Saved Config: ' + name + ": " + path + " => " + JSON.stringify(json, null, '  ')); // .substring(0, 50) + '...');
	return file.writeText(JSON.stringify(json));

}

Configuration.prototype.readPath = function(name) {

	var me=this;

	var path = me.configurationPath(name);
	var file = fs.File.fromPath(path);
	console.log('Read Config: ' + name + ": " + path + " => " + file.lastModified);
	return file.readText();
}

Configuration.SharedInstance = function() {
	if (!instance) {
		throw 'Singleton class requires instantiation';
	}
	return instance;
}

Configuration.prototype.hasCachedImage = function(name) {
	var me=this;
	return me.hasImage(name);
}

Configuration.prototype.cachedImagePath = function(name) {
	var me=this;
	return me.imagePath(name);
}

Configuration.prototype.hasConfiguration = function(name) {
	var me=this;
	return fs.File.exists(me.configurationPath(name));
}

Configuration.prototype.configurationPath = function(name) {
	var folder = fs.knownFolders.temp();
	var path = fs.path.join(folder.path, global.parameters.domain + '.' + name + ".json");
	return path;
}
Configuration.prototype.hasConfigurationResources = function(name) {
	return true;
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
			setTimeout(function(){
				resolve(me._configs[name]);
			},1);
			
			return;
		}



		var resolveLocalConfig = function() {

			console.log('Read Configuration: ' + name);

			me.readPath(name).then(function(string) {
				console.log('Successfully read config: ' + name);
				var config = JSON.parse(string);
				if (!me._defaultConfig) {
					config = me.prepareDefaultConfig(config);
					me._defaultConfig = config;
				} else {
					me._defaultConfig.parameters[name] = config.parameters;
				}
				me._configs[name] = config;

				me.getIncludes(config);

				resolve(config);

			}).catch(function(e) {
				console.log('Failed to read config: ' + name + ': ' + e);
				reject(e);
			});
		}

		if (me._shouldUseConfigCacheItem(name)) {
			resolveLocalConfig();
			return;
		}

		console.log('Fetch Configuration: ' + name);
		me.client.getConfiguration(name).then(function(config) {

			if (!me._defaultConfig) {
				config = me.prepareDefaultConfig(config);
				me._defaultConfig = config;
			} else {
				me._defaultConfig.parameters[name] = config.parameters;
			}
			me._configs[name] = config;

			me.getIncludes(config);

			me.saveConfig(name, config).then(function() {

			}).catch(function(e) {
				console.log('Failed to save config: ' + name + ': ' + e);
			});

			resolve(config);

		}).catch(function(e) {

			if (me.hasConfiguration(name)) {

				resolveLocalConfig();
				return;
			}

			reject(e);

		});


	});

}

Configuration.prototype._shouldUseConfigCacheItem = function(name) {
	var me = this;
	return !me._configItemIsExpired(name);

}
Configuration.prototype._shouldUseImageCacheItem = function(name, urlPath) {
	var me = this;
	return !me._imageItemIsExpired(name, urlPath);

}
Configuration.prototype._shouldUseStyleCacheItem = function(name) {
	var me = this;
	return !me._styleItemIsExpired(name);

}

Configuration.prototype._configItemIsExpired = function(name) {
	var me = this;
	return (!me.hasConfiguration(name))||(me._refreshCacheItems && me.getLocalDataModifiedDate(name) < me._refreshDate);

}
Configuration.prototype._imageItemIsExpired = function(name, urlPath) {
	var me = this;
	return (!me.hasImage(name))||(name!=urlPath&&me._refreshCacheItems && me._localImageModifiedDate(name) < me._refreshDate);

}
Configuration.prototype._styleItemIsExpired = function(name) {
	var me = this;
	return (!me.hasStyle(name))||(me._refreshCacheItems && me._localStyleModifiedDate(name) < me._refreshDate);

}

Configuration.prototype.extendDefaultParameters = function(data) {

	var me = this;

	if (!me._defaultConfig) {
		throw 'Configuration not set';
	}


	Object.keys(data).forEach(function(k) {
		me._defaultConfig.parameters[k] = data[k];
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


/**
 * Only for configuration files. JSON files!
 */
Configuration.prototype.getLocalDataModifiedDate = function(name) {
	var me=this;
	return me._localDataModifiedDate(name);
}
Configuration.prototype._localDataModifiedDate = function(name) {
	var me=this;
	if (me.hasConfiguration(name)) {
		var path = me.configurationPath(name);
		var file = fs.File.fromPath(path);
		return file.lastModified;
	}
	return false;
}
Configuration.prototype._localImageModifiedDate = function(name) {
	var me=this;
	if (me.hasImage(name)) {
		var path = me.imagePath(name);
		var file = fs.File.fromPath(path);
		return file.lastModified;
	}
	return false;
}
Configuration.prototype._localStyleModifiedDate = function(name) {
	var me=this;
	if (me.hasStyle(name)) {
		var path = me.stylePath(name);
		var file = fs.File.fromPath(path);
		return file.lastModified;
	}
	return false;
}

Configuration.prototype.getLocalData = function(name, defaultValue) {

	var me = this;

	console.log('Get Local Data: '+name);

	return new Promise(function(resolve, reject) {

		if (me.hasConfiguration(name)) {
			console.log('Has Local Data: '+name);
			me.readPath(name).then(function(string) {
				console.log('Successfully read data: ' + name + " " + me.configurationPath(name) + ":  " + string);
				var config = JSON.parse(string);
				resolve(config);
			}).catch(function(e) {
				console.log('Failed to read data: ' + name + ': ' + e);
				reject(e);
			});
			return;
		}
		console.log('Does not have: ' + me.configurationPath(name));
		console.log('Use default data: ' + name);
		setTimeout(function(){
			resolve(defaultValue);
		},1)
		
	});

}


Configuration.prototype.setLocalData = function(name, data) {
	var me=this;
	console.log('Store Local Data: ' + name + ":  " + JSON.stringify(data) + " " + me.configurationPath(name));
	return me.saveConfig(name, data);

}


/**
 * recurisively move through an object from a path string. ie: _get("name.value",{name:{value:"some value"}}) returns "some value"
 */
Configuration.prototype._get = function(path, config) {
	var me = this;
	var parts = path.split('.');
	var name = parts[0];


	if (typeof config[name] != 'undefined') {
		var value = config[name];
		if (parts.length > 1) {
			return me._get(parts.slice(1).join('.'), value);
		}
		return value;
	}


	//console.log("_get_ config: " + path + " does not exist in: "+JSON.stringify(config, null, '  '));

	return null;



}

Configuration.prototype.getDefaultParameters = function() {

	var me = this;

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


	var value = me._get(name, me._defaultConfig.parameters);
	if (value !== null) {
		return me._template.render(value, me.getDefaultParameters());

	}

	if (typeof defaultValue != 'undefined') {

		if (typeof defaultValue == 'function') {
			defaultValue = defaultValue();
		}

		console.log("get config: " + name + " does not exist: using default: " + JSON.stringify(defaultValue, null, '  '));
		return me._template.render(defaultValue, me.getDefaultParameters());

	}

	throw ('Undefined config parameter: ' + name);



}
Configuration.prototype.getIcon = function(name, urlPath) {

	var me = this;


	if (_isArray(name) && typeof name[0] == 'string') {
		name = name[0];
	}



	if (me._shouldUseImageCacheItem(name, urlPath)) {
		return me._getLocalImageSrc(name);
	}



	if (!urlPath) {

		urlPath = me.get(name, name);

	}


	//console.log('Requesting cacheable image: '+name+' '+urlPath);

	if (!urlPath) {
		throw "Empty url";
	}

	var url = me._formatUrl(urlPath) + "?thumb=128x128";

	return me._getImageSrc(name, url);

};

Configuration.prototype._getLocalImageSrc = function(name) {

	var me=this;
	var path = me.imagePath(name);
	return new Promise(function(resolve, reject) {
		setTimeout(function(){ resolve(path); }, 1);
	});

}

Configuration.prototype._getImageSrc = function(name, url) {

	var me = this;

	return new Promise(function(resolve, reject) {

		if (url.indexOf('http') !== 0) {
			url = me.client.getProtocol() + "://" + me.client.getUrl() + '/' + url;
		}

		require('http').getImage(encodeURI(url)).then(function(imgSource) {

			resolve(me.saveImage(name, imgSource));

		}).catch(function(error) {

			if (me.hasImage(name)) {
				me._getLocalImageSrc(name).then(function(thing) {
					resolve(thing);
				}).catch(function(e) {
					reject(e);
				})
				return;
			}

			reject(error);
		});

	});

}

Configuration.prototype.getImage = function(name, urlPath) {

	var me = this;



	if (me._shouldUseImageCacheItem(name, urlPath)) {
		return me._getLocalImageSrc(name);
	}



	if (!urlPath) {

		urlPath = me.get(name);

	}


	//console.log('Requesting cacheable image: '+name+' '+urlPath);

	if (!urlPath) {
		throw "Empty url";
	}


	var url = me._formatUrl(urlPath);


	return me._getImageSrc(name, url);


};

Configuration.prototype._formatUrl = function(url) {

	return url; //url.split('[').join('%5B').split(']').join('%5D');

	//://bcwf.geolive.ca/components/com_geolive/users_files/user_files_400/Uploads/%5BG%5D_eXv_N4u_%5BImAgE%5D_4on.png?thumb=48x48
}


Configuration.prototype.getStyle = function(name, urlPath) {

	var me = this;


	console.log("Request Style: " + name);

	var getLocalStylePromise = function() {
		var path = me.stylePath(name);
		return new Promise(function(resolve, reject) {

			setTimeout(function(){ resolve(path); }, 1);
			
		});
	}

	if (me._shouldUseStyleCacheItem(name)) {
		return getLocalStylePromise();
	}



	return new Promise(function(resolve, reject) {

		if (!urlPath) {

			urlPath = me.get(name);

		}



		if (!urlPath) {
			throw "Empty url";
		}


		var url = me._formatUrl(urlPath);
		if (url.indexOf('http') !== 0) {
			url = me.client.getProtocol() + "://" + me.client.getUrl() + '/' + url;
		}
		// Try to read the stylesheet from the cache
		console.log("Fetch Stylesheet: " + url);
		fetch(url)
			.then(function(response) {
				return response.text();
			})
			.then(function(text) {
				console.log(text);
				me.saveStyle(name, text);
				resolve(me.stylePath(name));
			})
			.catch(function(err) {

				if (me.hasStyle(name)) {
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