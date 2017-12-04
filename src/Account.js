

var singletonAccountInstance; 

function Account(config) {


	var me = this;

	if (singletonAccountInstance) {
		throw 'Singleton class instance has already been created!';
	}
	singletonAccountInstance = me;


};


try {

	var observableModule = require("data/observable");
	Account.prototype = new observableModule.Observable();

} catch (e) {
	/**
	 * TODO: extend Observable or Mock object in a way that supports unit tests
	 */
	console.error('Unable to extend Observable!!!');
}


Account.SharedInstance=function(){
    if(!singletonAccountInstance){
        throw 'Singleton class requires instantiation';
    }
    return singletonAccountInstance;
}


Account.prototype.getCurrentDeviceName = function() {
	var name = 'Unknown';

	var application = require("application");
	if (application.android) {
		name = "Android " + require("platform").device.model;
	}

	if (application.ios) {
		name = "IOS " + require("utils/utils").ios.getter(UIDevice, UIDevice.currentDevice).name;
	}
	return name;
}


Account.prototype._loadApplication = function() {

	var me=this;
	return me._getConfiguration().getConfiguration(me._getConfigurationName());

}


Account.prototype._setOffline = function() {
	global.setOffline();
}
Account.prototype._setOnline = function() {
	global.setOnline();
}

Account.prototype._getClient = function() {
	return global.client;
}

Account.prototype._getConfiguration = function() {
	return require('../').Configuration.SharedInstance();
}

Account.prototype._getConfigurationName = function() {
	return global.parameters.configuration;
}



Account.prototype.getDevice = function() {

	var me=this;

	return me._getConfiguration().getLocalData('device', false).then(function(device) {

		console.log('Local Device');

		if (device) {

			return device;
		}

		return new Promise(function(resolve, reject) {
			
			console.log('Registering Device: '+JSON.stringify(device, null, "   "));

			me._getClient().registerDevice(me.getCurrentDeviceName()).then(function(device) {

				me._getConfiguration().setLocalData('device', device);
				resolve(device);

			}).catch(function(err) {
				console.log('Registration Error: ' + JSON.stringify(err)+'Device": '+JSON.stringify(device));
				reject(err);
			})
		});


	});

};
Account.prototype.getDeviceAccount = function() {

	var me=this;

	console.log('Get Device Account');

	return me.getDevice().then(function(device) {

		console.log('Has Device: ' + JSON.stringify(device));

		return me._getConfiguration().getLocalData('account', false).then(function(account) {
			if (account) {
				return {
					device: device,
					account: account
				};
			}

			return new Promise(function(resolve, reject) {

				var provisioningKey = device.provisioningKey;
				if (!provisioningKey) {
					//Provisioning key should be provided to the app developer
					console.log('Requires Provisioning Key!');
				}

				me._getClient().createAccountForDevice(device.id, device.provisioningKey).then(function(account) {

					me._getConfiguration().setLocalData('account', account);
					resolve({
						device: device,
						account: account
					});

				}).catch(function(err) {
					console.log('Account Error: ' + err);
					reject(err);
				});



			});

		});

	});
};


Account.prototype.login = function() {

	var me = this;



	return new Promise(function(resolve, reject) {

		me.getDeviceAccount().then(function(credentials) {

			me._getClient().loginDevice(
				credentials.device.id,
				credentials.account.id,
				credentials.account.username,
				credentials.account.password
			).then(function(user) {



				console.log('device login');
				me._setOnline();
				me._loadApplication().then(function(config) {



					var eventData = {
						eventName: "login",
						object: me
					};
					me.notify(eventData);


					resolve(config);

					var eventData = {
						eventName: "updateSettings",
						object: me
					};
					me.notify(eventData);


					var eventData = {
						eventName: "ready",
						object: me
					};
					me.notify(eventData);

				}).catch(function(err) {
					console.log('Online Application Error: ' + err);
					reject(err);
				});



			}).catch(function(err) {
				console.log('client login error: ' + JSON.stringify(err));
				//Attempt to run offline:
				//try{      
				if (me._getConfiguration().hasConfiguration(me._getConfigurationName()) && me._getConfiguration().hasConfigurationResources(me._getConfigurationName())) {



					console.log('Can run offline');

					me._getConfiguration().getConfiguration(me._getConfigurationName()).then(function(config) {


						var eventData = {
							eventName: "shouldRunOffline",
							object: me
						};
						me.notify(eventData);



						me._setOffline();
						me._loadApplication().then(function(config) {
							resolve(config);

							var eventData = {
								eventName: "ready",
								object: me
							};
							me.notify(eventData);

						}).catch(function(err) {
							console.log('Offline Application Error: ' + err);
							reject(err);
						});
					});
					return;
				}


				var eventData = {
					eventName: "shouldExitOffline",
					object: me
				};
				me.notify(eventData);


			});



		}).catch(function(e) {
			console.log('FailFail');
			reject(e);
		});

	});


};

module.exports = Account;