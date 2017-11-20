"use strict";


var labelModule;
var textFieldModule;
var listPickerModule;
var switchModule;

var camera;
var video;
var stackLayoutModule;
var wrapLayoutModule;
var dockLayoutModule;
var imageModule;
var ImageSource;

var scrollViewModule;


var htmlViewModule;

var buttonModule;
var frameModule;
var progressModule;

var utilityModule;

var instance;

function ViewRenderer() {


	var me = this;

	labelModule = require("ui/label");
	textFieldModule = require("ui/text-field");
	listPickerModule = require("ui/list-picker");
	switchModule = require("ui/switch");
	camera = require("nativescript-camera");
	video = require("nativescript-videorecorder");
	stackLayoutModule = require("ui/layouts/stack-layout");
	wrapLayoutModule = require("ui/layouts/wrap-layout");
	dockLayoutModule = require("ui/layouts/dock-layout");
	imageModule = require("ui/image");
	ImageSource = require("image-source");
	scrollViewModule = require("ui/scroll-view");
	htmlViewModule = require("ui/html-view");
	buttonModule = require("ui/button");
	frameModule = require("ui/frame");
	progressModule = require("ui/progress");
	utilityModule = require("utils/utils");


	if (instance) {
		throw 'Singleton class instance has already been created! use ViewRenderer.SharedInstance()';
	}
	instance = me;


};



ViewRenderer.SharedInstance = function() {

	if (!instance) {
		throw 'Singleton class requires instantiation';
	}
	return instance

}


try {

	var observableModule = require("data/observable");
	ViewRenderer.prototype = new observableModule.Observable();

} catch (e) {
	/**
	 * TODO: extend Observable or Mock object in a way that supports unit tests
	 */
	console.error('Unable to extend Observable!!!');
}


ViewRenderer.prototype.currentView = function() {
	var me = this;
	return me._viewName;
};



ViewRenderer.prototype._app = function() {
	return require('tns-mobile-data-collector').DataAcquisitionApplication.SharedInstance();
}

ViewRenderer.prototype._config = function() {
	return require('../').Configuration.SharedInstance();
}

var getConfiguration = function() {
	return instance._config();
}
var decodeVariable = function(str, template) {
	return instance._parse(str, template);
}


ViewRenderer.prototype._parse = function(str, template, params) {


	var me = this;

	if (!me._template) {
		var Template = require('../').Template;
		me._template = new Template();
	}

	if(!params){
		params = me._params();
	}
	


	return me._template.render(str, params, template);

}

ViewRenderer.prototype._params = function(model) {

	var me=this;

	var params = JSON.parse(JSON.stringify(me._config().getDefaultParameters()));
	params.data = JSON.parse(JSON.stringify(me.getCurrentFormData(model)));
	return params;

}



ViewRenderer.prototype._bind = function(str, callback) {

	var me = this;
	callback(decodeVariable(str));
	if (me._shouldBindToData(str)) {
		me._bindToDataChangeEvents(str, callback);
	}

}

ViewRenderer.prototype._shouldBindToData = function(str) {
	if (str.indexOf('{data.') >= 0) {
		return true;
	}
}


ViewRenderer.prototype._bindToDataChangeEvents = function(str, callback) {
	var me = this;
	
	var model=me._model; 

	model.on(require("data/observable").Observable.propertyChangeEvent, function(data) {
		callback(me._parse(str, null, me._params(model)));
	});
}


ViewRenderer.prototype._addDataChangeEvents = function(str, callback) {
	var me = this;
	me._model.on(require("data/observable").Observable.propertyChangeEvent, function(data) {
		callback(decodeVariable(str));
	});
}



ViewRenderer.prototype._addStyle = function(el, field) {
	if(el&&field&&field.style){
		el.style=field.style;
	}


}

ViewRenderer.prototype._addClass = function(el, className) {
	if(el&&className&&className!==""){

		if(typeof className !="string"){
			if(!className.className){
				return;
			}
			className=className.className;
		}

		var classNames=(el.className?el.className:"").split(' ');
		if(classNames.indexOf(className)==-1){
			classNames.push(className)
			el.className=classNames.join(' ');
		}
	}


}

ViewRenderer.prototype._removeClass = function(el, className) {
	if(el&&className&&className!==""){

		if(typeof className !="string"){
			if(!className.className){
				return;
			}
			className=className.className;
		}

		var classNames=(el.className?el.className:"").split(' ');
		var index=classNames.indexOf(className)
		if(index>=0){
			classNames.splice(index,1);
			el.className=classNames.join(' ');
		}
	}


}



var renderHeading = function(container, field) {
	return instance.renderHeading(container, field);
}

ViewRenderer.prototype.renderHeading = function(container, field) {

	var me=this;
	var label=me.renderText(container, field);
	me._addClass(label, "heading");
	
	return label;

}

var renderLabel = function(container, field) {
	return instance.renderLabel(container, field);
}
ViewRenderer.prototype.renderLabel = function(container, field) {
	
	var me=this;
	var label=me.renderText(container, field);
	me._addClass(label, "label");
	return label;

}
ViewRenderer.prototype.renderText = function(container, field) {
	var me = this;

	var label = new labelModule.Label();
	instance._bind(field.value, function(value) {
		label.text = value
	});

	me._addStyle(label, field);
	me._addClass(label, field);

	label.textWrap = true;

	container.addChild(label);
	return label;
}




var renderHtml = function(container, field) {



	var htmlView = new htmlViewModule.HtmlView();
	htmlView.html = decodeVariable(field.value);
	container.addChild(htmlView);

}


ViewRenderer.prototype.renderLocation = function(container, field, model) {

	var me = this;


	if (field.field) {
		console.log('Render location field');
		model.set(field.name, [0, 0]);
		me.renderField(container, field.field, model);
	}

	me._app().requireAccessToGPS().then(function(geolocation) {

		console.log('Requesting location');


		var location = geolocation.watchLocation(
			function(loc) {

				if (loc) {
					console.log("Current location is: " + JSON.stringify(loc));
					model.set(field.name, [loc.latitude, loc.longitude]);
				}

			},
			function(e) {
				console.log("Error: " + e.message);
				//getLocation();
			}, {
				desiredAccuracy: 3,
				updateDistance: 10,
				minimumUpdateTime: 1000 * 10
			});


	});


}

var extend = function(a, b) {

	b = b || {};
	Object.keys(b).forEach(function(k) {
		a[k] = b[k];
	});

	return a;
}


ViewRenderer.prototype.back = function(num) {

	var me = this;

	var topmost = frameModule.topmost();
	global.setFormData(me.getCurrentFormData());
	me._popSubform();


	var n = num || 1;
	while (n > 0) {
		topmost.goBack();
		topmost = frameModule.topmost();
		n--;
	}
}


ViewRenderer.prototype.submit = function(num) {

	var me = this;

	global.setFormData(me.getCurrentFormData());

	var n = num || 0;
	while (n > 0) {
		me._popSubform();
		global.setFormData(me.getCurrentFormData());
		n--;
	}


	global.submitForm();
}

ViewRenderer.prototype.cancel = function() {

	var me = this;

	var topmost = frameModule.topmost();
	//global.setFormData(me.getCurrentFormData());
	me._popSubform();
	console.log('Cancel');


	topmost.goBack();
}

ViewRenderer.prototype.renderMediaPicker = function(container, field, model) {

	var me = this;

	var mediaSelection = new wrapLayoutModule.WrapLayout();

	me._addClass(mediaSelection,  "media-selection")
	container.addChild(mediaSelection);

	var mediaOptions = extend({

		showImage: true,
		showVideo: false,
		showAudio: false,

		labelForImage: "Add Image",
		labelForVideo: "Add Video",
		labelForAudio: "Add Audio"



	}, field);



	var imageAssets = [];
	model.set(field.name, imageAssets);

	if (mediaOptions.showImage || mediaOptions.showVideo) {



		me._app().requireAccessToCamera().then(function(camera) {


			
			

			var addPhoto = function() {



				camera.takePicture({
						width: 500,
						height: 500,
						keepAspectRatio: true,
						saveToGallery: true
					})
					.then(function(imageAsset) {
						var image = new imageModule.Image();
						image.src = imageAsset;
						global.storeImageSource(imageAsset).then(function(filename) {

							//Note: I was recieving an out of memory error until I set imageAsset to null
							imageAsset = null;

							imageAssets.push(filename);
							model.set(field.name, imageAssets);
							console.log('Took picture');


						}).catch(function(err) {
							console.log("Error -> " + err.message);
						});
						mediaSelection.addChild(image);


					}).catch(function(err) {
						console.log("Error -> " + err.message);
					});
			}


			var addVideo = function() {

				console.log("add video");
				var videorecorder = new video.VideoRecorder();
				var options = {
					//saveToGallery:true,
					duration:60, //(seconds) default no limit | optional
					format:'mp4', //allows videos to be played on android devices | optional | recommended for cross platform apps
					size:10, //(MB) default none | optional #android
					hd:true, //default false low res | optional
					format:'mp4',
					explanation: "Why do i need this permission" //optional on api 23 #android
				}

				videorecorder.record(options)
					.then((data) => {
						console.log(data.file)

						imageAssets.push(data.file);
						model.set(field.name, imageAssets);

						getConfiguration().getImage('video-icon').then(function(imgPath){
							var image = new imageModule.Image();
							image.src = imgPath;
							mediaSelection.addChild(image)
						})


					})
					.catch((err) => {
						console.log('Video Error:'+err)
					})

			}

			if (field.required) {
				if (imageAssets.length == 0) {
					setTimeout(function() {
						addPhoto();
					}, 1000);

				}
			}

			var buttons = []

			if (mediaOptions.showImage) {
				buttons.push({
					label: mediaOptions.labelForImage,
					className: "add-photo",
					onTap: function() {
						addPhoto();
					}
				});
			}

			if (mediaOptions.showVideo) {
				buttons.push({
					label: mediaOptions.labelForVideo,
					className: "add-video",
					onTap: function() {
						addVideo();
					}
				})
			}

			renderButtons(mediaSelection, buttons);



		});

	}


	if (mediaOptions.showAudio) {



		var buttons = [];
		buttons.push({
			label: mediaOptions.labelForAudio,
			className: "add-video",
			onTap: function() {

				me._showSubform({
					"className": "submit",

					"name": "audio-picker",

					"fields": [
						// {
						// 	"type": "style",
						// 	"stylename": "app-style"
						// },
						{
							"type": "audiorecorder"
						}, {
							"type": "label",
							"value":"Duration: {data.seconds}s"
						},{
							"type": "label",
							"value":"File: {data.filename}"
						},{
							"className": "cancel",
							"type": "button",
							"position": "bottom-left",
							"label": "Cancel",
							"action": function(data) {
								me.cancel();
							}
						}, {
							"className": "",
							"position": "bottom-right",
							"type": "button",
							"label": "Save",
							"action": function(data) {

								me.back();
								model.set("audio-picker", data);
								console.log("audiorecorder data: "+JSON.stringify(data, null, "   "));
								console.log("Main data: "+JSON.stringify(me.getCurrentFormData(), null, "   "));


								imageAssets.push(data.filename);
								model.set(field.name, imageAssets);

								getConfiguration().getImage('audio-icon').then(function(imgPath){
									var image = new imageModule.Image();
									image.src = imgPath;
									mediaSelection.addChild(image)
								})
								
								


							}

						}
					]
				})


			}
		})


		renderButtons(mediaSelection, buttons);

	}



}




ViewRenderer.prototype.renderAudioRecorder = function(container, field, model) {

	var me = this;

	renderLabel(container, {
		value: "Audio Recorder"
	});

	var application = require("application");
	var filename = new Date().getTime() + (application.android?'.mp3':'.m4a');



	var fs = require("file-system");
	var savepath = fs.knownFolders.documents().path;
	var filepath = fs.path.join(savepath, filename);



	
	var recorderOptions={
		filename: filepath,
		infoCallback: function() {
			console.log("callback: " + JSON.stringify(arguments));
		},
		errorCallback: function() {
			console.log(arguments);
		}
	};
	if (application.android) {
		var permissions = require('nativescript-permissions');
		permissions.requestPermission(android.Manifest.permission.RECORD_AUDIO, "Let me hear your thoughts...")
			.then(function() {})


			recorderOptions.source=android.media.MediaRecorder.AudioSource.MIC;
			
		
	}


	var TNSRecorder = require("nativescript-audio").TNSRecorder;
	me._recorder = new(TNSRecorder)();
	//var permissions = require('nativescript-permissions');

	

	model.set('filename', filename);
	
	console.log(filename);

	var interval=null;
	var secondsx10=0;
	model.set('seconds', 0.0);

	var button = me.renderButtonsetButton(container, {
		label: "Record",
		className: "record-audio btn-main",
		onTap: function() {
			if (button.text == "Record") {
				

				


				if (TNSRecorder.CAN_RECORD()) {
					console.log('Ready to record');
					me._recorder.start(recorderOptions).then(function(something) {

						button.text = "Stop";
						console.log('Recording');
						console.log(something);
						secondsx10=0;
						model.set('seconds', 0.0);
						interval=setInterval(function(){
							secondsx10+=1;
							model.set('seconds', Math.round(secondsx10)/10.0);
						},100);


					}).catch(function(e) {
						console.log("Audio Error " + e);
					});
				} else {

					console.log('Not Ready')
				}



			} else {
				button.text = "Record";
				me._recorder.stop();
				model.set('audio', filepath);
				if(interval){
					clearInterval(interval);
				}
			}

		}
	});

}

var renderTextField = function(container, field, model) {



	var textfield = new textFieldModule.TextField();

	textfield.hint = field.placeholder;

	instance._addClass(textfield, "textfield")
	var bindingOptions = {
		sourceProperty: field.name,
		targetProperty: "text",
		twoWay: true
	}

	textfield.bind(bindingOptions, model);
	model.set(field.name, "");

	container.addChild(textfield);

}

var renderOptionList = function(container, field) {

	var picker = new listPickerModule.ListPicker();
	picker.items = field.values;
	picker.selectedIndex = field.value;
	container.addChild(picker);

}


var renderBoolean = function(container, field, model) {

	var toggle = new switchModule.Switch();


	toggle.text = "Button";

	var bindingOptions = {
		sourceProperty: field.name,
		targetProperty: "checked",
		twoWay: true
	}

	toggle.bind(bindingOptions, model);


	model.set(field.name, !!field.value);

	var stackLayout = new stackLayoutModule.StackLayout();

	instance._addClass(stackLayout, "boolean");

	container.addChild(stackLayout);
	stackLayout.orientation = "horizontal";
	stackLayout.addChild(toggle);

	renderLabel(stackLayout, {
		value: field.label
	});

}



var renderButtons = function(container, fields, model) {



	var buttons = [];
	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";
	container.addChild(stackLayout);

	fields.forEach(function(field) {
		var button = new buttonModule.Button();
		button.text = field.label;
		if (field.onTap) {
			button.on(buttonModule.Button.tapEvent, field.onTap);
		}


	
		instance._addClass(button, field);


		stackLayout.addChild(button);
		buttons.push(button);
	});



	return buttons;
}



var renderIconselect = function(container, field, model) {


	var buttons = [];
	var clearSelected = function() {
		buttons.forEach(function(b) {
			instance._removeClass(b, "selected");
		});
	}

	var wrapLayout = new wrapLayoutModule.WrapLayout();

	instance._addClass(wrapLayout, "iconselect");
	container.addChild(wrapLayout);

	decodeVariable(field.icons, field.template).forEach(function(icon) {

		var imageStack = new stackLayoutModule.StackLayout();
		wrapLayout.addChild(imageStack);

		var stackLayout = new stackLayoutModule.StackLayout();
		instance._addClass(stackLayout, "icon value-" + icon.value.toLowerCase());

		imageStack.addChild(stackLayout);



		getConfiguration().getIcon(icon.icon)

		.then(function(imgPath) {

				var image = new imageModule.Image();
				image.src = imgPath;
				stackLayout.addChild(image);
				renderLabel(imageStack, {
					value: icon.value
				})

			})
			.catch(function(err) {
				console.log("Render Image Error: " + err);
			});


		var selectIcon = function() {
			console.log('set:' + field.name + ' -> ' + icon.icon);
			model.set(field.name, icon.value);
			clearSelected();
			instance._addClass(stackLayout, "selected");

		};
		if (icon.value == field.value) {
			selectIcon();
		}

		stackLayout.on(buttonModule.Button.tapEvent, function(args) {
			selectIcon();
		});
		buttons.push(stackLayout);

	});
	console.log(buttons);
	return buttons;

}


var renderImage = function(container, url, model, page) {
	var image = new imageModule.Image();
	var src = url;
	if(url.indexOf('{')){

		 src = decodeVariable(url);
		 console.log('Variable Image: '+src);

	}
	if (src[0] !== "~") {
		src = 'https://' + global.client.getUrl() + "/" + url;
	}



	image.src = src;
	container.addChild(image);
	return image;
}

ViewRenderer.prototype.renderButtonset = function(container, field, model, page) {

	var me=this;

	var buttons = [];


	var wrapLayout = new wrapLayoutModule.WrapLayout();

	me._addClass(wrapLayout, "buttonset");
	me._addClass(wrapLayout, field);


	container.addChild(wrapLayout);

	

	field.buttons.forEach(function(button) {

		var btnEl=me.renderButtonsetButton(wrapLayout, button);
		buttons.push(btnEl);	

		me.applyTapAction(btnEl,function(){
			me._setSelected(btnEl, button, buttons);
		});

	});


	//console.log(buttons);
	return buttons;

}

ViewRenderer.prototype._clearSelected = function(buttons) {
	var me=this;
	buttons.forEach(function(b) {
		me._removeClass(b, "selected");
	});
}

ViewRenderer.prototype.renderButtonsetButton = function(container, field) {

	var me=this;

	var imageStack = new stackLayoutModule.StackLayout();
		container.addChild(imageStack);

		var stackLayout = new stackLayoutModule.StackLayout();
		stackLayout.className = "icon";

		me._addClass(stackLayout, "icon");
		me._addClass(stackLayout, field);

		imageStack.addChild(stackLayout);

		var onTapFns = [];
		if (field.icon) {



			getConfiguration().getImage(field.icon)

				.then(function(imgPath) {

					console.log('Got Buttonset Image path')

					var image = new imageModule.Image();
					image.src = imgPath;
					stackLayout.addChild(image);
					renderLabel(imageStack, {
						value: field.label
					})


					// onTapFns.push(function() {
					// 	image.className = "spin-fast";
					// })

				})
				.catch(function(err) {
					console.log("Field Button Error: " + err);
					//Still render the label.
					renderLabel(imageStack, {
						value: field.label
					})
				});

		} else {

			renderButton(stackLayout, button);
		}
		
		return stackLayout;



}
ViewRenderer.prototype.renderButton = function(container, field, model) {

	var me = this;



	var button = new buttonModule.Button();
	//button.text = field.label;

	me._bind(field.label, function(value) {
		button.text = value
	});


	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";

	if (field.image) {
		var image = renderImage(stackLayout, field.image);
		me._addClass(image, "button-image");
	}

	container.addChild(stackLayout);

	stackLayout.addChild(button);

	if (field.action) {

		console.log('Apply Tap');
		me.applyTapAction(stackLayout, field, model);
		me.applyTapAction(button, field, model);

	} else {

		console.log("There is no tap acction for field: " + JSON.stringify(field, null, "   "));
	
	}

	me._addClass(button, field);


	return button;
}



ViewRenderer.prototype._setSelected = function(button, field, buttons) {

	var me=this;

	if(buttons){
		me._clearSelected(buttons);
	}	


	console.log('Tap');
	// onTapFns.forEach(function(fn) {
	// 	fn();
	// })

	if (field.action == 'form') {



		setTimeout(function() {
			var topmost = frameModule.topmost();
			topmost.navigate({
				moduleName: "views/form/form",
				context: JSON.parse(JSON.stringify(field))
			});
		}, 500);

		return;
	} else if (field.action == 'link') {

		utilityModule.openUrl(field.link);
		return;

	} else if (field.action != 'none') {

		var topmost = frameModule.topmost();

		console.log('Attempting to navigate to custom view: views/' + field.action + '/' + field.action);

		topmost.navigate({
			moduleName: "views/" + field.action + "/" + field.action
		});
		return;
	}


	if (field.name && field.value) {
		console.log('set:' + field.name + ' -> ' + field.value);
		me._model.set(field.name, field.value);
		me._addClass(button, "selected");
	}

}


var renderSpace = function(container, field) {

}

var renderStyle = function(container, field, model, page) {


	getConfiguration().getStyle(field.stylename)

	.then(function(stylePath) {


			console.log(stylePath);
			page.addCssFile(stylePath);

		})
		.catch(function(err) {
			console.log("Render Style Error: " + err);
		});

}



var renderList = function(container, field, model) {



}


var renderProgressBar = function(container, field, model) {



	var progress = new progressModule.Progress();
	progress.value = field.value || 0;



	var label = new labelModule.Label();
	label.text = '{progress.label}';
	instance._addClass(label, "label");

	var timeout = null;

	global.addProgressIndicator(function(finished, total) {
		if (finished === 0) {
			try {

				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}

				container.addChild(progress);
				container.addChild(label);
			} catch (e) {
				console.log('Progress error' + e.message);
			}
		}

	}, function(text, value) {

		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}

		label.text = text;
		progress.value = value;

	}, function(finished, total) {
		if (finished === total) {
			timeout = setTimeout(function() {
				try {
					container.removeChild(progress);
					container.removeChild(label);
				} catch (e) {
					console.log('Progress complete error' + e.message);
				}
			}, 1000);

		}

	});


}

ViewRenderer.prototype._pushSubform = function(name, callback) {

	var me = this;
	if (!me._models) {
		me._models = [];
	}
	me._models.push(me._model);

	global.pushSubform(name, callback);
};
ViewRenderer.prototype._popSubform = function(name, callback) {
	var me = this;
	me._model = me._models.pop();
	global.popSubform();
};



ViewRenderer.prototype.renderForm = function(container, field, model) {

	var me = this;


	var button = me.renderButton(container, {
		label: field.label
	});

	if (field.value) {
		model.set(field.name, field.value);
	}


	if (field.persist === true) {


		getConfiguration().getLocalData(field.name, field.value || {}).then(function(data) {

			model.set(field.name, data);

		}).catch(function(e) {
			console.log('failed to get local data: ' + e);
		})
	}

	instance._addClass(button, "subform");
	button.on(buttonModule.Button.tapEvent, function(args) {
		me._showSubform(field);
	});



}

ViewRenderer.prototype._showSubform = function(field, callback) {

	var me = this;

	if (field.persist === true) {
		var chain = callback;
		callback = function(data) {
			console.log('Returned From Subform: ' + JSON.stringify(data))
			getConfiguration().setLocalData(field.name, data).then(function() {
				console.log('wrote local: ' + field.name);
				chain(data);
			}).catch(function(e) {
				console.log('Failed to store local dataset: ' + field.name + ': ' + e);
			});


		};


	}

	me._pushSubform(field.name, callback);


	/**
	 * Note: I'm carefully allowing field to pass through withough making sure it is completely disconnected from 
	 * any object references (using json) so that functions are not lost. (audio picker...)
	 */
	var contextOptions = extend({}, field); //JSON.parse(JSON.stringify(field));
	if (field.name) {
		contextOptions.form = contextOptions.form || field.name;

	}

	if (field.persist === true) {



		getConfiguration().getLocalData(field.name, {}).then(function(data) {
			global.setFormData(me.getCurrentFormData());



			var topmost = frameModule.topmost();
			topmost.navigate({
				moduleName: "views/form/form",
				//clearHistory: true,
				backstackVisible: false,
				context: contextOptions
			});


		}).catch(function(e) {
			console.log('failed to get local data: ' + e);
		})

		return;

	}

	var topmost = frameModule.topmost();
	topmost.navigate({
		moduleName: "views/form/form",
		//clearHistory: true,
		backstackVisible: false,
		context: contextOptions
	});
}






/**
 * add Tap event Handler for element. 
 * action can be a string, or object with key `action`.
 * if action='event'` then must be {"action":"event", "event":"someEventName"}
 */

ViewRenderer.prototype.applyTapAction = function(button, action, model) {


	var me = this;
	var field=action;

	if(action.action){
		action=action.action
	}

	console.log('Apply button action ' + action);





	if (typeof action == "function") {
		/**
		 * Not possible if form is defined in json...
		 */

		console.log("Button With Function!");

		button.on(buttonModule.Button.tapEvent, function() {
			action(me.getCurrentFormData());
		});

		return;

	}


	if (action == 'submit') {
		button.on(buttonModule.Button.tapEvent, function() {

			me.submit(field.back);

		});

		return
	}

	if (action == 'back') {
		button.on(buttonModule.Button.tapEvent, function() {

			me.back(field.back);

		});
		return
	}

	if (action == 'link') {

		button.on(buttonModule.Button.tapEvent, function() {
			utilityModule.openUrl(field.link);
			return;
		});

	}

	if (action == 'form') {
		button.on(buttonModule.Button.tapEvent, function() {
			var topmost = frameModule.topmost();
			topmost.navigate({
				moduleName: "views/form/form",
				context: JSON.parse(JSON.stringify(field))

			});
		});
		return
	}

	if (action == 'event') {
		button.on(buttonModule.Button.tapEvent, function() {
			var eventData = {
				eventName: field.event,
				object: this
			};
			me.notify(eventData);
		});
		return
	}

	console.log('Unknown button tap action: ' + action);



};

ViewRenderer.prototype.renderScroll = function(container, fields, model, page) {
	var me = this;

	console.log(scrollViewModule.ScrollView);
	var scrollView = new scrollViewModule.ScrollView();
	scrollView.orientation = "horizontal";
	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";
	container.addChild(scrollView);
	scrollView.content = stackLayout;
	me.renderFieldset(stackLayout, fields.fields, model, page);

}

ViewRenderer.prototype.renderFieldset = function(container, fields, model, page) {
	var me = this;

	fields.forEach(function(field) {
		me.renderField(container, field, model, page);
	});
}

ViewRenderer.prototype.renderField = function(defaultParentNode, field, model, page) {


	var me = this;


	if (!field) {
		throw 'Requires a field!'
	}

	var container = defaultParentNode;
	if (field.position) {
		var node = page.getViewById(field.position);
		if (node) {
			container = node;
		}
	}


	if (!field.type) {
		throw 'Field must have a type! ' + JSON.stringify(field, null, "   ")
	}

	if (field.type == 'heading') {
		renderHeading(container, field, model);
		return;
	}

	if (field.type == 'label') {
		renderLabel(container, field, model);
		return;
	}

	if (field.type == 'media') {
		me.renderMediaPicker(container, field, model);
		return;
	}


	if (field.type == 'audiorecorder') {

		me.renderAudioRecorder(container, field, model);
		return;
	}

	if (field.type == 'textfield') {
		renderTextField(container, field, model);
		return;
	}

	if (field.type == 'optionlist') {
		renderOptionList(container, field, model);
		return;
	}
	if (field.type == 'boolean') {
		renderBoolean(container, field, model);
		return;
	}

	if (field.type == 'iconselect') {
		renderIconselect(container, field, model);
		return;
	}


	if (field.type == 'space') {
		renderSpace(container, field, model);
		return;
	}

	if (field.type == 'location') {
		me.renderLocation(container, field, model);
		return;
	}

	if (field.type == 'form') {
		me.renderForm(container, field, model);
		return;
	}

	if (field.type == 'button') {
		me.renderButton(container, field, model);
		return;
	}

	if (field.type == 'buttonset') {
		me.renderButtonset(container, field, model, page);
		return;
	}

	if (field.type == 'progressbar') {
		renderProgressBar(container, field, model, page);
		return;
	}

	if (field.type == 'style') {
		renderStyle(container, field, model, page);
		return;
	}
	if (field.type == 'scroll') {
		me.renderScroll(container, field, model, page);
		return;
	}
	if (field.type == 'image') {
		renderImage(container, field.image, model, page);
		return;
	}
	if (field.type == 'html') {
		renderHtml(container, field, model, page);
		return;
	}

	if (field.type == 'data') {
		Object.keys(field.data).forEach(function(k) {
			console.log('add form data: ' + k + ' ' + field.data[k]);
			model.set(k, field.data[k]);
		});
		return;
	}

	console.log('Unknown field type: ' + field.type + ': ' + JSON.stringify(field));

}

ViewRenderer.prototype.hasView = function(formName) {

	var forms = global.parameters.views;

	if (typeof forms == 'string' && forms[0] == "{") {
		forms = decodeVariable(forms);
	}

	return !!forms[formName];


}


ViewRenderer.prototype.getCurrentFormData = function(model) {
	var me = this;

	var data = {};
	if(!model){
		model=me._model;
	}
	Object.keys(model).forEach(function(k) {
		if (k.indexOf('_') === 0) {
			return;
		}
		data[k] = model[k];
	});


	console.log("Current Form Data: " + JSON.stringify(data, null, "   "));
	return JSON.parse(JSON.stringify(data));
}

ViewRenderer.prototype.setCurrentFormData = function(data) {

	var me = this;

	console.log('Set Model Data From Form Data: ' + JSON.stringify(data) + " For Current View: " + global.getSubformName());
	Object.keys(data).forEach(function(k) {
		console.log('set ' + k + '=' + data[k]);
		me._model.set(k, data[k]);
	});
}

ViewRenderer.prototype.renderView = function(page, model) {

	var me = this;
	me._model = model;
	me._page = page;


	model.on(require("data/observable").Observable.propertyChangeEvent, function(data) {
		console.log('on ' + data.propertyName + ' changed: ' + JSON.stringify(data.value));
		//console.log('Property Changed '+JSON.stringify(data));
		//console.log('Properties '+JSON.stringify(page.bindingContext));
	});


	page.bindingContext = model;


	var context = page.navigationContext;
	console.log('Rendering view with context: ' + JSON.stringify(context, null, "   "));
	var container = page.getViewById("container");

	var formName = "main";
	if (context) {
		if (context.form) {
			formName = context.form;
		}
		if (context.events) {
			Object.keys(context.events).forEach(function(e) {
				me.on(e, context.events[e]);
			});
		}
	}


	me._viewName = formName;

	me._addClass(container, "form-" + formName)




	var elements = [];

	if (context.fields) {
		elements = context.fields
	} else {

		//backward compatibility for bcwf. parameters.forms!
		var forms = global.parameters.views || global.parameters.forms;

		if (typeof forms == 'string' && forms[0] == "{") {
			forms = decodeVariable(forms);
		}

		elements = forms[formName];
	}


	if (typeof elements == 'string' && elements[0] == "{") {
		elements = decodeVariable(elements);
	}

	if (!elements) {
		throw 'Invalid form fields: (' + (typeof elements) + ') for ' + formName;
	}

	me.renderFieldset(container, elements, model, page);

	var data = global.getFormData();
	me.setCurrentFormData(data);
	me.getCurrentFormData();


	var eventData = {
		eventName: "renderedView",
		object: this
	};

	me.notify(eventData);

}

module.exports = ViewRenderer;