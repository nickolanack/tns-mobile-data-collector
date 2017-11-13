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


ViewRenderer.prototype._parse = function(str, template) {


	var me=this;
	
	if(!me._template){
		var Template = require('../').Template;
		me._template=new Template();
	}

	var params=JSON.parse(JSON.stringify(me._config().getDefaultParameters()));
	params.data=JSON.parse(JSON.stringify(me.getCurrentFormData()));


	return me._template.render(str, params, template);

}

ViewRenderer.prototype._bind = function(str, callback) {

	var me=this;
	callback(decodeVariable(str));
	if(me._shouldBindToData(str)){
		me._bindToDataChangeEvents(str, callback);
	}

}

ViewRenderer.prototype._shouldBindToData = function(str) {
	if(str.indexOf('{data.')>=0){
		return true;
	}
}


ViewRenderer.prototype._bindToDataChangeEvents = function(str, callback) {
	var me=this;
	me._model.on(require("data/observable").Observable.propertyChangeEvent, function (data) {
		callback(decodeVariable(str));
    });
}


ViewRenderer.prototype._addDataChangeEvents = function(str, callback) {
	var me=this;
	me._model.on(require("data/observable").Observable.propertyChangeEvent, function (data) {
		callback(decodeVariable(str));
    });
}





var renderHeading = function(container, field) {



	var label = new labelModule.Label();
	instance._bind(field.value, function(value){
		label.text=value
	});
	label.className = "heading";
	label.textWrap = true;
	container.addChild(label);

}
var renderLabel=function(container, field) {
	return instance.renderLabel(container, field);
}





ViewRenderer.prototype.renderLabel = function(container, field) {

	var me=this;

	var label = new labelModule.Label();
	var value = decodeVariable(field.value);

	instance._bind(field.value, function(value){
		label.text=value
	});

	label.className = "label";
	label.textWrap = true;
	container.addChild(label);

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

var extend=function(a,b){

	b=b||{};
	Object.keys(b).forEach(function(k){
		a[k]=b[k];
	});

	return a;
}

ViewRenderer.prototype.renderMediaPicker = function(container, field, model) {

	var me = this;

	var wrapLayout = new wrapLayoutModule.WrapLayout();
	wrapLayout.className = "media-selection";
	container.addChild(wrapLayout);

	var mediaOptions=extend({

		showImage:true,
		showVideo:false,
		showAudio:false,

		labelForImage:"Add Image",
		labelForVideo:"Add Video",
		labelForAudio:"Add Audio"



	}, field);


	if(mediaOptions.showImage||mediaOptions.showVideo){



		me._app().requireAccessToCamera().then(function(camera) {


			var imageAssets = [];
			model.set(field.name, imageAssets);

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
						wrapLayout.addChild(image);


					}).catch(function(err) {
						console.log("Error -> " + err.message);
					});
			}


			var addVideo = function() {

				console.log("add video");

				var videorecorder = new video.VideoRecorder();
				var options = {

					explanation: "Why do i need this permission" //optional on api 23 #android
				}

				videorecorder.record(options)
					.then((data) => {
						console.log(data.file)
					})
					.catch((err) => {
						console.log(err)
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

			renderButtons(wrapLayout, buttons);



		});

	}


	if(mediaOptions.showAudio){



		var buttons=[];
				buttons.push({
					label: mediaOptions.labelForAudio,
					className: "add-video",
					onTap: function() {
						
						me._showSubform({
							"className": "submit",
							
							"name":"audio-picker",
							
							"fields": [{
								"type": "style",
								"stylename": "app-style"
							},{
								"type":"audiorecorder"
							}]
						})


					}
				})
	

			renderButtons(wrapLayout, buttons);

	}

	



}


ViewRenderer.prototype.renderAudioRecorder = function(container, field, model) {

	var me=this;
	
	renderLabel(container, {
		value: "Audio Recorder"
	});




	var TNSRecorder=require("nativescript-audio").TNSRecorder;
	me._recorder = new (TNSRecorder)();
	//var permissions = require('nativescript-permissions');

	var button=renderButtons(container,[{
		label: "Record",
		className: "record-audio",
		onTap: function() {
			if(button.text=="Record"){
				button.text="Stop";


				if(TNSRecorder.CAN_RECORD()){
					console.log('Ready to record')
				}else{
					console.log('Not Ready')
				}



			}else{
				button.text="Record";
			}
			
		}
	}])[0]

}

var renderTextField = function(container, field, model) {



	var textfield = new textFieldModule.TextField();

	textfield.hint = field.placeholder;

	textfield.className = "textfield";
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
	stackLayout.className = "boolean";
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


		if (field.className) {

			button.className += " " + field.className;

		}

		stackLayout.addChild(button);
		buttons.push(button);
	});



	return buttons;
}



var renderIconselect = function(container, field, model) {


	var buttons = [];
	var clearSelected = function() {
		buttons.forEach(function(b) {

			var c = b.className.split(' ');
			var i = c.indexOf("selected");
			if (i >= 0) {
				c.splice(i, 1);
			}
			var className = c.join(' ');
			console.log(b.className + " -> " + className);
			b.className = className;
		});
	}

	var wrapLayout = new wrapLayoutModule.WrapLayout();
	wrapLayout.className = "iconselect";
	container.addChild(wrapLayout);

	decodeVariable(field.icons, field.template).forEach(function(icon) {

		var imageStack = new stackLayoutModule.StackLayout();
		wrapLayout.addChild(imageStack);

		var stackLayout = new stackLayoutModule.StackLayout();
		var className = "icon value-" + (icon.value.toLowerCase());
		stackLayout.className = className;
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
			stackLayout.className = "selected " + className
			console.log('set:' + field.name + ' className -> ' + "selected " + className);

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
	if (src[0] !== "~") {
		src = 'https://' + global.client.getUrl() + "/" + url;
	}

	image.src = src;
	container.addChild(image);
	return image;
}

var renderButtonset = function(container, field, model, page) {


	var buttons = [];
	var clearSelected = function() {
		buttons.forEach(function(b) {

			var c = b.className.split(' ');
			var i = c.indexOf("selected");
			if (i >= 0) {
				c.splice(i, 1);
			}
			var className = c.join(' ');
			console.log(b.className + " -> " + className);
			b.className = className;
		});
	}

	var wrapLayout = new wrapLayoutModule.WrapLayout();
	wrapLayout.className = "buttonset";
	//wrapLayout.horizontalAlignment='center';
	if (field.className) {
		wrapLayout.className = "buttonset " + field.className;
	}
	container.addChild(wrapLayout);



	field.buttons.forEach(function(button) {

		var imageStack = new stackLayoutModule.StackLayout();
		wrapLayout.addChild(imageStack);

		var stackLayout = new stackLayoutModule.StackLayout();
		stackLayout.className = "icon";
		imageStack.addChild(stackLayout);

		if (button.className) {
			stackLayout.className = "icon " + button.className;
		}

		var onTapFns = [];
		if (button.icon) {



			getConfiguration().getImage(button.icon)

			.then(function(imgPath) {

					var image = new imageModule.Image();
					image.src = imgPath;
					stackLayout.addChild(image);
					renderLabel(imageStack, {
						value: button.label
					})


					// onTapFns.push(function() {
					// 	image.className = "spin-fast";
					// })

				})
				.catch(function(err) {
					console.log("Field Button Error: " + err);
					//Still render the label.
					renderLabel(imageStack, {
						value: button.label
					})
				});

		} else {

			//renderButton(stackLayout, button);
		}

		stackLayout.on(buttonModule.Button.tapEvent, function(args) {

			console.log('Tap');
			onTapFns.forEach(function(fn) {
				fn();
			})

			if (button.action == 'form') {



				setTimeout(function() {
					var topmost = frameModule.topmost();
					topmost.navigate({
						moduleName: "views/form/form",
						context: JSON.parse(JSON.stringify(button))
					});
				}, 500);

				return;
			} else if (button.action == 'link') {

				utilityModule.openUrl(button.link);
				return;

			} else if (button.action != 'none') {

				var topmost = frameModule.topmost();
				
				console.log('Attempting to navigate to custom view: views/' + button.action + '/' + button.action);

				topmost.navigate({
					moduleName: "views/" + button.action + "/" + button.action
				});
				return;
			}


			if (field.name && button.value) {
				console.log('set:' + field.name + ' -> ' + button.value);
				model.set(field.name, button.value);
				clearSelected();
				stackLayout.className = "selected icon"
			}


		});
		buttons.push(stackLayout);

	});
	//console.log(buttons);
	return buttons;

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
	label.className = "label";

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

ViewRenderer.prototype._pushSubform=function(name, callback){

	var me=this;
	if(!me._models){
		me._models=[];
	}
	me._models.push(me._model);

	global.pushSubform(name, callback);
};
ViewRenderer.prototype._popSubform=function(name, callback){
	var me=this;
	me._model=me._models.pop();
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


		getConfiguration().getLocalData(field.name, field.value||{}).then(function(data) {

			model.set(field.name, data);

		}).catch(function(e) {
			console.log('failed to get local data: ' + e);
		})
	}

	button.className = "subform";
	button.on(buttonModule.Button.tapEvent, function(args) {
		me._showSubform(field);
	});



}

ViewRenderer.prototype._showSubform = function(field, callback) {

	var me=this;
	
		if (field.persist === true) {
			var chain=callback;
			callback = function(data) {
				console.log('Returned From Subform: ' + JSON.stringify(data))
				getConfiguration().setLocalData(field.name, data).then(function() {
					console.log('wrote local: ' + field.name);
					chain(data);
				}).catch(function(e){
					console.log('Failed to store local dataset: '+field.name+': '+e );
				});


			};


		}

		me._pushSubform(field.name, callback);


		var contextOptions=JSON.parse(JSON.stringify(field));
		if(field.name){
			contextOptions.form=contextOptions.form||field.name;
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



ViewRenderer.prototype.renderButton = function(container, field, model) {

	var me = this;



	var button = new buttonModule.Button();
	button.text = field.label;

	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";

	if (field.image) {
		var image = renderImage(stackLayout, field.image).className += " button-image";
	}

	container.addChild(stackLayout);

	stackLayout.addChild(button);

	if (field.action) {

		me.applyTapAction(stackLayout, field, model);
		me.applyTapAction(button, field, model);

	}

	if (field.className) {

		button.className += " " + field.className;

	}


	return button;
}



ViewRenderer.prototype.applyTapAction = function(button, field, model) {

	var me = this;

	var action = field.action;
	console.log('Apply button action ' + action);

	if (action == 'submit') {
		button.on(buttonModule.Button.tapEvent, function() {


			global.setFormData(me.getCurrentFormData());

			var n=field.back||0;
			while(n>0){
				me._popSubform();
				global.setFormData(me.getCurrentFormData());
				n--;
			}


			
			global.submitForm();


		});
		return
	}

	if (action == 'back') {
		button.on(buttonModule.Button.tapEvent, function() {
			var topmost = frameModule.topmost();
			global.setFormData(me.getCurrentFormData());
			me._popSubform();
			console.log('Back: ' + JSON.stringify(model));

			var n=field.back||1;
			while(n>0){
				topmost.goBack();
				topmost = frameModule.topmost();
				n--;
			}
			
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

ViewRenderer.prototype.renderField = function(container, field, model, page) {


	var me = this;


	if (!field) {
		throw 'Requires a field!'
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
		renderButtonset(container, field, model, page);
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


ViewRenderer.prototype.getCurrentFormData = function() {
	var me = this;

	var data = {};
	Object.keys(me._model).forEach(function(k) {
		if (k.indexOf('_') === 0) {
			return;
		}
		data[k] = me._model[k];
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


	model.on(require("data/observable").Observable.propertyChangeEvent, function (data) {
        console.log('on '+data.propertyName+' changed: '+ JSON.stringify(data.value));
        //console.log('Property Changed '+JSON.stringify(data));
        //console.log('Properties '+JSON.stringify(page.bindingContext));
    });


	page.bindingContext = model;


	var context = page.navigationContext;
	console.log('Rendering view with context: '+JSON.stringify(context, null, "   "));
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


	
	container.className = "form-" + formName;




	var elements=[];

	if(context.fields){
 		elements = context.fields
	}else{

		//backward compatibility for bcwf. parameters.forms!
		var forms = global.parameters.views||global.parameters.forms;

		if (typeof forms == 'string' && forms[0] == "{") {
			forms = decodeVariable(forms);
		}

		elements = forms[formName];
	}


	if (typeof elements == 'string' && elements[0] == "{") {
		elements = decodeVariable(elements);
	}

	if (!elements) {
		throw 'Invalid form fields: (' + (typeof fields) + ') for ' + formName;
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