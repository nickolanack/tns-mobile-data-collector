"use strict";


var labelModule;
var textFieldModule;
var listPickerModule;
var switchModule;
var geolocation;
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



function ViewRenderer() {
	labelModule = require("ui/label");
	textFieldModule = require("ui/text-field");
	listPickerModule = require("ui/list-picker");
	switchModule = require("ui/switch");
	geolocation = require("nativescript-geolocation");
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
};

try{
	
	var observableModule = require("data/observable");
	ViewRenderer.prototype = new observableModule.Observable();

}catch(e){
	/**
	 * TODO: extend Observable or Mock object in a way that supports unit tests
	 */
	console.error('Unable to extend Observable!!!');
}


var decodeVariable = function(str, template) {

	console.log('Decoding Variable ' + str);
	return global.configuration.decodeVariable(str, template);
}



var renderHeading = function(container, field) {



	var label = new labelModule.Label();
	label.text = decodeVariable(field.value);
	label.className = "heading";
	label.textWrap = true;
	container.addChild(label);

}

var renderLabel = function(container, field) {



	var label = new labelModule.Label();
	label.text = decodeVariable(field.value);
	label.className = "label";
	label.textWrap = true;
	container.addChild(label);

}

var renderHtml = function(container, field) {



	var htmlView = new htmlViewModule.HtmlView();
	htmlView.html = decodeVariable(field.value);
	container.addChild(htmlView);

}


var renderLocation = function(container, field, model) {


	var getLocation = function() {

		console.log('Requesting location');

		model.set('coordinates', [0, 0]);

		var location = geolocation.watchLocation(
			function(loc) {
				if (loc) {
					console.log("Current location is: " + JSON.stringify(loc));
					model.set('coordinates', [loc.latitude, loc.longitude]);
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


	}


	// if (geolocation.isEnabled()) {
	//	getLocation();
	// 	return;
	// }



	console.log('Location requests are not enabled. Attempting to enable.')
	geolocation.enableLocationRequest().then(function() {
		console.log(arguments);
		getLocation();
	}).catch(function(e) {
		console.log(arguments);
	});



}



var renderMediaPicker = function(container, field, model) {

	camera.requestPermissions()

	var wrapLayout = new wrapLayoutModule.WrapLayout();
	wrapLayout.className = "media-selection";
	container.addChild(wrapLayout);



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

	var buttons = [{
		label: 'Add photo',
		className: "add-photo",
		onTap: function() {
			addPhoto();
		}
	}];
	if (field.showVideo !== false) {
		buttons.push({
			label: 'Add video',
			className: "add-video",
			onTap: function() {
				addVideo();
			}
		})
	}

	renderButtons(container, buttons);



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
			b.className = "icon";
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



		global.configuration.getIcon(icon.icon)
			// .then(function(config){
			// 	console.log('Got Config');
			// 	return global.configuration.getImage(icon.icon, config.parameters[icon.icon]);
			// })
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
			console.log(b.className);
			b.className = "icon";
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


		if (button.icon) {



			global.configuration.getImage(button.icon)
				// .then(function(config){
				// 	return global.configuration.getImage(button.icon, config.parameters[button.icon]);

			// })
			.then(function(imgPath) {

					var image = new imageModule.Image();
					image.src = imgPath;
					stackLayout.addChild(image);
					renderLabel(imageStack, {
						value: button.label
					})

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

			if (button.action == 'form') {

				var topmost = frameModule.topmost();
				//global.pushSubform(button.form);
				topmost.navigate({
					moduleName: "views/form/form",
					context: {
						form: button.form
					}
				});
				return;
			} else if (button.action == 'link') {

				utilityModule.openUrl(button.link);
				return;

			} else if (button.action != 'none') {

				var topmost = frameModule.topmost();
				//global.pushSubform(button.form);
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


	global.configuration.getStyle(field.stylename)
		// .then(function(config){
		// 	console.log('Got Config');
		// 	return global.configuration.getImage(icon.icon, config.parameters[icon.icon]);
		// })
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




ViewRenderer.prototype.renderForm = function(container, field, model) {

	var me = this;


	var button = me.renderButton(container, {
		label: field.label
	});

	if (field.value) {
		model.set(field.name, field.value);
	}


	if (field.persist === true) {


		global.configuration.getLocalData(field.name, {}).then(function(data) {

			model.set(field.name, data);

		}).catch(function(e) {
			console.log('failed to get local data: ' + e);
		})
	}

	button.on(buttonModule.Button.tapEvent, function(args) {

		var callback = null;
		if (field.persist === true) {
			callback = function(data) {
				console.log('Returned From Subform: ' + JSON.stringify(data))
				global.configuration.setLocalData(field.name, data).then(function() {
					console.log('wrote local: ' + field.name);
				})
			};


		}

		global.pushSubform(field.name, callback);

		if (field.persist === true) {
			global.configuration.getLocalData(field.name, {}).then(function(data) {
				global.setFormData(data);

				var topmost = frameModule.topmost();
				topmost.navigate({
					moduleName: "views/form/form",
					//clearHistory: true,
					backstackVisible: false,
					context: {
						form: field.name
					}
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
			context: {
				form: field.name
			}
		});
	});

	button.className = "subform";


}


ViewRenderer.prototype.renderButton = function(container, field, model) {

	var me = this;



	var button = new buttonModule.Button();
	button.text = field.label;

	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";

	if (field.image) {
		renderImage(stackLayout, field.image).className += " button-image";
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
			global.setFormData(model);
			global.submitForm();
		});
		return
	}

	if (action == 'back') {
		button.on(buttonModule.Button.tapEvent, function() {
			var topmost = frameModule.topmost();
			global.setFormData(model);
			global.popSubform();
			console.log('Back: ' + JSON.stringify(model));
			topmost.goBack();
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
			//global.pushSubform(button.form);
			topmost.navigate({
				moduleName: "views/form/form",
				context: {
					form: field.form
				}
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

		if (field.type == 'heading') {
			renderHeading(container, field, model);
			return;
		}

		if (field.type == 'label') {
			renderLabel(container, field, model);
			return;
		}

		if (field.type == 'media') {
			renderMediaPicker(container, field, model);
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
			renderLocation(container, field, model);
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

	});
}

ViewRenderer.prototype.renderView = function(context, container, model, page) {

	var me = this;
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



	var forms = global.parameters.forms;
	container.className = "form-" + formName;

	if (typeof forms == 'string' && forms[0] == "{") {
		forms = decodeVariable(forms);
	}

	var elements = forms[formName];


	if (!elements) {
		throw 'Invalid form fields: (' + (typeof fields) + ') for ' + formName;
	}

	me.renderFieldset(container, elements, model, page);
	var data = global.getFormData();
	console.log('Set Model Data From Form Data: ' + JSON.stringify(data) + " For Current View: " + global.getSubformName());
	Object.keys(data).forEach(function(k) {
		console.log('set ' + k + '=' + data[k]);
		model.set(k, data[k]);
	});

}

module.exports = ViewRenderer;