//var events = require("events");



function CoreAppClient(config) {
	var me = this;
	me.config = config;







};


CoreAppClient.NativeScriptClient=function(domain){

	return new CoreAppClient({
		"url":domain,
		"request":function(options, data, callback) {

	        var form = Object.keys(data).map(function(k) {
	            return k + "=" + encodeURI(data[k]);
	        }).join('&');
	        var http = require('http');

	        var url = options.protocol+'://' + options.host + options.path
	        console.info(url + '&' + form);


	        var timeout=setTimeout(function() {

	            console.error('Request timed out '+JSON.stringify(options));
	            timeout=null;
	            callback('Request timed out');

	        }, 10000);

	        http.request({
	            url: url,
	            method: "POST",
	            headers: {
	                "Content-Type": "application/x-www-form-urlencoded"
	            },
	            timeout:20000,
	            content: form
	        }).then(function(response) {

	            if(!timeout){
	                console.warn('already timed out');
	                return;
	            }
	            clearTimeout(timeout);
	            timeout=null;
	            callback(null, response, response.content);

	        }, callback).catch(function(e){
	            console.error('Request Failed: '+e);
	            callback(e);
	        });
	    },

	   "promise":function(executer) {
	        return new Promise(executer);
	    }
	});
}




var request = function(options, data, callback) {
	var https = require('https');

	options.headers= {
              "Content-Type": "application/x-www-form-urlencoded"
            };
	var req = https.request(options, (res) => {

		var content='';
		res.on('data', (chunk) => {
			content = content + chunk;
		});
		res.on('end', () => {
			callback(null, res, content);
		});
	});

	req.on('error', (e) => {
		callback(e);
	});
	req.write(Object.keys(data).map(function(k){ return k+'='+encodeURI(data[k]); }).join('&'));
	req.end();

}

var promise=function(callback){

	return new Promise(callback);

}

CoreAppClient.prototype.getUrl = function() {
	return this.config.url;
}

var _isIPV4Address= function(domain){
	return domain.split(":").shift().split('.').length===4
}

CoreAppClient.prototype.getProtocol = function() {

	if(this.config.protocol){
		return this.config.protocol;
	}

	if(_isIPV4Address(this.getUrl())){
		return 'http';
	}
	return 'https';
}

CoreAppClient.prototype.getPath = function() {
	if(this.getProtocol()=="http"){
		return "core.php?0=1&format=ajax";
	}
	return "administrator/components/com_geolive/core.php?0=1&format=ajax"
}


CoreAppClient.prototype.getPathForTask = function(task, pathComponent) {

	var path = this.getPath();

	if (pathComponent) {
		path=pathComponent;
	}

	if (this._token) {
		path=path+"&access_token="+this._token.token;
	}

	path=path+'&task='+task;

	return path;
	
}


CoreAppClient.prototype.promise = function(callback) {
	var me=this;
	// if(me.config.promise){
	// 	console.log('overide promise');
	// }
	return (me.config.promise||promise)(callback);
}
CoreAppClient.prototype.request = function(options, data) {

	var me=this;


	return me.promise(function(resolve, reject) {

		(me.config.request||request)(options, data, function(err, response, content) {

			if (err) {
				console.error('Client Request error: '+err);
				reject(err);
				return;
			}

            //console.log(options.path+':'+content);

           	try{
				var obj = JSON.parse(content);
			}catch(e){
				console.error('Request Json Error: '+JSON.stringify(options)+' '+content);
				reject(e+": "+content);
				return;
			}

			if (obj) {
				
				if(obj.success){
					resolve(obj);
					return;
				}
				console.error('Request Json Error: Expected response.success==true for '+JSON.stringify(options));
				reject(obj);
				return;
			}
			
			reject(obj);

		});
	});

};


CoreAppClient.prototype.task = function(task, params, pathComponent) {

	var me = this;


	var data={};
	//data.task = task;
	data.json = "{}";
	if (params) {
		data.json = JSON.stringify(params);
	}



	//console.log('task: '+task+" : "+me.getPathForTask(task, pathComponent));

	return me.request({
		protocol:me.getProtocol(),
		host: me.getUrl(),
		path: '/'+me.getPathForTask(task, pathComponent),
		method: 'POST',
	}, data);

}

CoreAppClient.prototype.isConnected = function() {
	var me = this;

	return me.promise(function(resolve, reject) {

		if (me._connected && me._connected > (Date.now() - (10 * 1000))) {
			resolve(me._connectedObj);
			return;
		}


		me.task("echo", {
			"hello": "world"
		}).then(function(obj) {

		
			if (obj && obj.hello === "world") {
				me._connected = Date.now();
				me._connectedObj = obj;
				resolve(obj);
				return;
			}

			reject(obj);

		}).catch(reject);

	});

}



CoreAppClient.prototype.login = function(username, password) {
	var me = this;

	console.log('Attemp Login: '+username);

	return me.promise(function(resolve, reject) {

		me.isConnected().then(function() {

			console.log('Attemp Login: '+username);

			return me.task("login", {
				"username": username,
				"password": password
			}, "index.php?option=com_geolive&format=ajax&iam=node-client.guest").then(function(user) {

				me._id = user.id;
				me._token = user.access_token;

				console.log('Login Completed Successfully: '+username);

				resolve(user);
			})

		}).catch(function(e){
			console.error('Login Failed');
			reject(e);
		});


	});
};



CoreAppClient.prototype.getLoginStatus = function() {
	var me = this;
	return me.promise(function(resolve, reject) {

		if (me._id && me._id > 0) {
			//console.log('resolve true');
			resolve(true);
			return;
		}

		

		me.getUserMetadata().then(function(metadata) {
			if (metadata.details.id > 0) {
				resolve(true)
			}
			resolve(false);

		}).catch(reject);

		

	});

}


CoreAppClient.prototype.subscribe = function(channel, event, handler) {
	var me = this;


	if (!me._pusher) {
		var Pusher = require("pusher-js");

		me.pusher = new Pusher(me.config.pusherAppKey);

	}

	me.pusher.subscribe(channel).bind(event, handler);

}


CoreAppClient.prototype.broadcast = function(channel, event, data) {
	var me = this;

	return me.executeTask("emit_notification", {
		"plugin": "Notifications",
		"channel": channel,
		"event": event,
		"data": data
	});




}


CoreAppClient.prototype.executeTask= function(task, data, pathComp) {
	var me = this;
	return me.isConnected().then(function() {
		return me.task(task, data, pathComp);
	});
};


CoreAppClient.prototype.getUserMetadata = function(user) {
	var user = user > 0 ? user : -1
	var me = this;
	return me.executeTask("user_metadata", {
		"user": user
	});

};





CoreAppClient.prototype.registerDevice = function(deviceName) {
	var me = this;
	return me.executeTask("register_device", {
		"deviceName": deviceName,
		"plugin":"Apps"
	});

};



CoreAppClient.prototype.createAccountForDevice = function(deviceId, provisioningKey) {
	var me = this;
	return me.executeTask("create_account", {
		"deviceId": deviceId,
		"provisioningKey": provisioningKey,
		"plugin":"Apps"
	}, "index.php?option=com_geolive&format=ajax&iam=node-client.guest");
};




CoreAppClient.prototype.getConfiguration = function(name) {
	var me = this;
	return me.isConnected().then(function() {

		return me.task("get_configuration", {
			"widget": name
		});

	});
};

CoreAppClient.prototype.getTemplate = function(name) {
	var me = this;
	return me.isConnected().then(function() {

		return me.task("get_template", {
			"widget": name,
		});

	});
};




CoreAppClient.prototype.loginDevice = function(deviceId, accountId, username, password) {
	var me = this;


	return me.promise(function(resolve, reject) {


		 me.executeTask("login_device", {
				"deviceId": deviceId,
				"accountId": accountId,
				"username": username,
				"password": password,
				"plugin":"Apps"
			},  "index.php?option=com_geolive&format=ajax&iam=node-client.guest").then(function(user) {

				me._id = user.id;
				me._token = user.access_token;


				resolve(user);

			}).catch(function(e){
				//console.log('Why did this fail1'+e);
				reject(e);
			});

		});


};


CoreAppClient.prototype.createMarker = function(layerId, data, attributes) {
	var me = this;
	return me.executeTask("marker_new", {
			"marker": data,
			"attributes":attributes,
			"layerId":layerId
	});
};

CoreAppClient.prototype.createFeature= function(featureData) {
	var me = this;
	return  me.executeTask("marker_new", featureData);
};





CoreAppClient.prototype.getUsersMarkers = function() {
	var me = this;
	return me.executeTask("users_mapitem_list", {
		});

};

CoreAppClient.prototype.getLayer = function(layerId) {
	var me = this;
	return me.executeTask("layer_display", {
			"layerId":layerId,
			"format":"json",
			"plugin":"Maps"
	});

};




module.exports = CoreAppClient;