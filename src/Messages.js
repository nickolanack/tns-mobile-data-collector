var dialogs = require("ui/dialogs");
var Pusher = require("pusher-nativescript").Pusher;
var IPublicChannelEventListener = require("pusher-nativescript/interfaces");

function Messages() {

var me=this;
me.prefix='mobile.';

// Creating a new Pusher instance
var pusher = new Pusher('74594f87fe548689b03a');
 
// Establishing a connection with Pusher
pusher.connect().then(() => {
  // Connected successfully
}).catch(error => {
  // Handling connection errors
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
			me.alert({
				"message":JSON.stringify(data)
			})
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
	  // Some errors have occurred when subscribing and/or binding the event
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


module.exports = Messages;