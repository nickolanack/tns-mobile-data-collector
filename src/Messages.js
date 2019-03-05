var dialogs;
var Pusher;
//var IPublicChannelEventListener;

var loaded=false;

function Messages(params) {


	if(loaded){
		console.log('Should be singleton');
		throw 'Should be singleton';
	}
	loaded=true;

	dialogs = require("ui/dialogs");
	
	var me=this;
	me.params=params;


	try{
		Pusher = require("nativescript-pusher").Pusher;
		//IPublicChannelEventListener = require("pusher-nativescript/interfaces");

		setTimeout(function(){
	        me.connect();
	    },4000);

	}catch(e){
		console.warn('Pusher error: will not be able to subscribe to events');
    	console.error(e);
	}

	

};
Messages.prototype.connect=function(){



	var me=this;
	var params=me.params;


	me.prefix=params.hasOwnProperty("pusherAppChannelPrefix")?params.pusherAppChannelPrefix:'dev.';
	console.log('Initializing pusher: '+params.pusherAppKey+' + '+me.prefix);
	// Creating a new Pusher instance
	var pusher = new Pusher(params.pusherAppKey,{
		cluster:params.pusherCluster,
		encrypted:true
	});
	 
	


	pusher.connect(function(err) {

		if(err){
			console.log("Pusher Error Connect:"+JSON.stringify({
			  	"pusherAppChannelPrefix":params.hasOwnProperty("pusherAppChannelPrefix")?params.pusherAppChannelPrefix:'dev.',
			  	"pusherAppKey":params.pusherAppKey
			  })+": "+err+JSON.stringify(err));

		}

	  console.log('Pusher Connected Successfully');
	  me.pusher=pusher;

	  if(me._queue){
	  	console.log('Adding queued subscriptions');
	  	me._queue.forEach(function(sub){
	  		me._subscribe(sub.channel, sub.event, sub.callback);
	  	});
	  	delete me._queue;
	  }

	});

	console.log('Pusher connecting.');
}



Messages.prototype.subscribe = function(channel, event, callback) {
	var me=this;
	if(me.pusher){
		me._subscribe(channel, event, callback);
		return;
	}
	if(!me._queue){
		me._queue=[];
	}
	console.log('Channel subscription and event binding queued: '+channel+' '+event);
	me._queue.push({channel:channel, event:event, callback:callback});
	
}
Messages.prototype._subscribe = function(channel, event, callback) {

	var me=this;
	if(!callback){
		callback=function(err, data){

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
		    callback(JSON.parse(JSON.stringify(response.data))); //IOS but responce data containers NSDictionary ...
		  },
		 
		  onSubscriptionSucceeded:function(channelName) {
		    console.log(`${channelName} subscription has been succeeded`);
		  }
		};

	 
	var channelTypeAndName =''+me.prefix+channel;
	var eventName = event;
	 
	console.log('Channel subscription and event binding attempting: '+channel+' '+event);
	//me.pusher.subscribeToChannelEvent(channelTypeAndName, eventName, publicChannelEventsListeners)


	me.pusher.subscribeToChannelEvent(channelTypeAndName, eventName, function(err, message){

		callback(message.data);
	});

	// .then(function() {
	//   console.log('Channel subscription and event binding succeeded');
	// }).catch(function(error){
	// 	console.log("Pusher Error Subscribe: "+JSON.stringify(error));
	// })
	 

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