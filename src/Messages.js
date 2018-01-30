var dialogs;
var Pusher;
var IPublicChannelEventListener;

var loaded=false;

function Messages(params) {

	if(loaded){
		throw 'Should be singleton';
	}
	loaded=true;

	dialogs = require("ui/dialogs");
	Pusher = require("pusher-nativescript").Pusher;
	IPublicChannelEventListener = require("pusher-nativescript/interfaces");

	var me=this;
	me.prefix=params.hasOwnProperty("pusherAppChannelPrefix")?params.pusherAppChannelPrefix:'dev.';
	console.log('Initializing pusher: '+params.pusherAppKey+' + '+me.prefix);
	// Creating a new Pusher instance
	var pusher = new Pusher(params.pusherAppKey);
	 
	// Establishing a connection with Pusher
	pusher.connect().then(() => {
	  // Connected successfully
	}).catch(error => {
	  console.log("Pusher Error Connect:"+JSON.stringify({
	  	"pusherAppChannelPrefix":params.hasOwnProperty("pusherAppChannelPrefix")?params.pusherAppChannelPrefix:'dev.',
	  	"pusherAppKey":params.pusherAppKey
	  }));
	  console.log(error);
	});
	 
	me.pusher=pusher;

	 
	// Disconnecting from the service
	//pusher.disconnect();







};

Messages.prototype.subscribe = function(channel, event, callback) {

	var me=this;
	if(!callback){
		callback=function(data){

			if(data.text){
				me.alert({
					"message":JSON.stringify(data.text)
				});
				return;
			}


			//default

			me.alert({
				"message":JSON.stringify(data)
			});
		};
	}

	// Listeners to listen for public specific events
	var publicChannelEventsListeners={
		  onEvent:function(response) {
		    console.log('Handling new arriving data from my_event');
		    console.log(JSON.stringify(response.data));
		    callback(response.data);
		  },
		 
		  onSubscriptionSucceeded:function(channelName) {
		    console.log(`${channelName} subscription has been succeeded`);
		  }
		};

	 
	var channelTypeAndName ='public-'+me.prefix+channel;
	var eventName = event;
	 
	// Subscribing to a public channel and listening for events called "my_event" sent to "my_public_channel"
	me.pusher.subscribe(channelTypeAndName, eventName, publicChannelEventsListeners).then(() => {
	  console.log('Channel subscription and event binding succeeded');
	}).catch(error => {
	  console.log("Pusher Error Subscribe");
	  console.log(error);
	})
	 

}


Messages.prototype.alert = function(args) {

	console.log('okButtonText: '+(typeof args.okButtonText));
	if((typeof args.okButtonText)=='undefined'){
		args.okButtonText='Ok';
	}

	return dialogs.alert(args).then(function() {
		console.log("Dialog closed!");
	});

};

Messages.prototype.confirm = function(args) {

	console.log('okButtonText: '+(typeof args.okButtonText));
	if((typeof args.okButtonText)=='undefined'){
		args.okButtonText='Yes';
	}
	if((typeof args.cancelButtonText)=='undefined'){
		args.cancelButtonText='No';
	}


	return dialogs.confirm(args).then(function(result) {
		console.log("Dialog closed!: "+result);
		return result;
	});

};



module.exports = Messages;