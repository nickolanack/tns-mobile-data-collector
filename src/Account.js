var exit = require('nativescript-exit').exit;

var dialogs = require("ui/dialogs");

var platform = require("tns-core-modules/platform");
console.log(JSON.stringify(platform));

function Account() {};



var client = global.client;
var configuration = global.configuration;

var configurationName=global.parameters.configuration;

var loadApplication = function() {

	return configuration.getConfiguration(configurationName);

}



var getDevice = function() {

	return configuration.getLocalData('device', false).then(function(device) {

		if (device) {

			return device;
		}

		return new Promise(function(resolve, reject) {
			console.log('Register Device');
			client.registerDevice("Android").then(function(device) {

				configuration.setLocalData('device', device);
				resolve(device);

			}).catch(function(err) {
				console.log('Registration Error: ' + JSON.stringify(err));
			})
		});


	});

};
var getDeviceAccount = function() {
	return getDevice().then(function(device) {

		console.log('Has Device: ' + JSON.stringify(device));

		return configuration.getLocalData('account', false).then(function(account) {
			if (account) {
				return {
					device: device,
					account: account
				};
			}

			return new Promise(function(resolve, reject) {

				var provisioningKey=device.provisioningKey;
				if(!provisioningKey){
					//Provisioning key should be provided to the app developer
				}

				client.createAccountForDevice(device.id, device.provisioningKey).then(function(account) {

					configuration.setLocalData('account', account);
					resolve({
						device: device,
						account: account
					});

				}).catch(function(err) {
					console.log('Account Error: ' + err);
				});



			});

		});

	});
};


Account.prototype.login = function() {

	return new Promise(function(resolve, reject) {

		getDeviceAccount().then(function(credentials) {

			client.loginDevice(
				credentials.device.id,
				credentials.account.id,
				credentials.account.username,
				credentials.account.password
			).then(function(user) {

				console.log('device login');
				global.setOnline();
				loadApplication().then(function(config){
					resolve(config);
				}).catch(function(err) {
					console.log('Online Application Error: ' + err);
				});



			}).catch(function(err) {
				console.log('client login error: ' + JSON.stringify(err));
				//Attempt to run offline:
				//try{      
				if (configuration.hasConfiguration(configurationName) && configuration.hasConfigurationResources(configurationName)) {



					console.log('Can run offline');

					configuration.getConfiguration(configurationName).then(function(config) {

						global.messages.alert({
								"title": configuration.get(
									'dialog-offline-title', "Offline Mode"
								),
								"message": configuration.get(
									'dialog-offline-message', "This app can run offline but will require an internet connection at a later date to submit forms"
								)
							})
							.then(function() {
								console.log("Dialog closed!");
							});

						global.setOffline();
						loadApplication().then(function(config){
							resolve(config);
						}).catch(function(err) {
							console.log('Offline Application Error: ' + err);
						});
					});
					return;
				}

				global.messages.alert({
					title: "Unable to connect to app server",
					"message": "This app needs to connect to the internet on first use."
				}).then(function() {
					exit();
				});



				// }catch(e){
				//      console.log(e);
				// }

			});



		}).catch(function(){
			console.log('FailFail');
		});

	});


};

module.exports = Account;