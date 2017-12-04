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

ViewRenderer.prototype._getParser = function() {
	var me = this;

	if (!me._template) {
		var Template = require('../').Template;
		me._template = new Template();
	}
	return me._template;
}
ViewRenderer.prototype._parse = function(str, template, params) {


	var me = this;

	if(!params){
		params = me._params();
	}
	
	return me._getParser().render(str, params, template);

}

ViewRenderer.prototype._params = function(model) {

	var me=this;

	var params = JSON.parse(JSON.stringify(me._config().getDefaultParameters()));
	params.data = JSON.parse(JSON.stringify(me.getCurrentFormData(model)));
	return params;

}



ViewRenderer.prototype._bind = function(str, callback) {

	var me = this;
	callback(me._parse(str));
	if (me._shouldBindToData(str)) {
		me._bindToDataChangeEvents(str, callback);
	}

}



ViewRenderer.prototype._hasFormDataTemplate = function(str) {
	return str.indexOf('{data.') >= 0;
}

ViewRenderer.prototype._shouldBindToData = function(str) {
	var me=this;
	if (me._hasFormDataTemplate(str) || me._getParser().hasTemporalFormatter(str)) {
		return true;
	}
}

ViewRenderer.prototype._bindToDataChangeEvents = function(str, callback) {

	var me = this;
	var model=me._model;



	if(me._hasFormDataTemplate(str)){		

		me._addUpdateEventListener(str, function(data) {
			callback(me._parse(str, null, me._params(model)));
		})

	}
	
	if(me._getParser().hasTemporalFormatter(str)){
		me._addUpdateInterval(str, function(){
			var val=me._parse(str, null, me._params(model));
			//onsole.log('Update temporally bound item: '+val);
			callback(val);
		}, 1000);
	}

}

ViewRenderer.prototype._addUpdateEventListener=function(str, eventFn){
	var me=this;
	var model=me._model;
	model.on(require("data/observable").Observable.propertyChangeEvent, eventFn);

	if(!me._eventListeners){
		me._eventListeners=[];
	}
	me._eventListeners.push(eventFn);

}

ViewRenderer.prototype._removeEventListeners=function(list){
	var me=this;
	console.log('Clear Events');
	var events=(list||me._eventListeners||[]);
	events.forEach(function(eventFn){
		me._model.removeEventListener(require("data/observable").Observable.propertyChangeEvent, eventFn);
	});

	if(list&&me._eventListeners){
		list.forEach(function(e){
			var i=me._eventListeners.indexOf(e);
			if(i>=0){
				me._eventListeners.splice(i,1);
			}
		})
	}else{
		me._eventListeners=[];
	}

}


ViewRenderer.prototype._watchEventBindings=function(fn){

	var me=this;
	var l=0;
	if(me._eventListeners){
		l=me._eventListeners.length;
	}

	fn();

	if(me._eventListeners){
		return me._eventListeners.slice(l);
	}
	return [];

}

ViewRenderer.prototype._watchIntervalBindings=function(fn){

	var me=this;
	var l=0;
	if(me._intervals){
		l=me._intervals.length;
	}

	fn();

	if(me._intervals){
		return me._intervals.slice(l);
	}
	return [];

}



ViewRenderer.prototype._addUpdateInterval=function(name, fn, time){
	var me=this;
	var interval=setInterval(fn, time);

	/**
	 * TODO: manage intervals gracefully on page transistions.
	 */
	
	if(!me._intervals){
		me._intervals=[];
	}

	me._intervals.push([name, interval, fn, time]);

}

ViewRenderer.prototype._clearUpdateIntervals=function(list){
	var me=this;
	console.log('Clear Update Intevals');

	var intervals=list||me._intervals||[];

	if(me._intervals){
		me._intervals.forEach(function(item){
			console.log('Clear: '+item[0]+' '+item[2].toString());
			clearInterval(item[1]);
		});
	}


	if(list&&me._intervals){
		list.forEach(function(e){
			var i=me._intervals.indexOf(e);
			if(i>=0){
				me._intervals.splice(i,1);
			}
		})
	}else{
		me._intervals=[];
	}
}


ViewRenderer.prototype._addDataChangeEvents = function(str, callback) {
	var me = this;
	me._model.on(require("data/observable").Observable.propertyChangeEvent, function(data) {
		callback(me._parse(str));
	});
}



ViewRenderer.prototype._addStyle = function(el, field) {
	if(el&&field&&field.style){
		el.style=field.style;
	}


}

/**
 * adds class name to element, and if classname contains 
 * bindable string template then it is bound to that variable.
 * 
 */
ViewRenderer.prototype._addClass = function(el, className) {


	var me=this;

	if(el&&className&&className!==""){

		if(typeof className !="string"){
			if(!className.className){
				return;
			}
			className=className.className;
		}



		var last=[];
		me._bind(className, function(value) {

			var current=me._arrayUnique(value.split(' '));

			if(last.length){
				var diff=me._arrayDiff(last, current);
				console.log("Removing Classname Diff: "+JSON.stringify(last)+' '+JSON.stringify(current)+' -> '+JSON.stringify(diff));
				me._removeClass(el, diff);
			}
			
			last=current;
			

			var classNames=me._arrayUnique(el.className?el.className.split(' '):[]);
			el.className=me._arrayJoin(classNames, current).join(' ');

		});
		
	}


}


ViewRenderer.prototype._arrayDiff=function(a, b){

	return a.filter(function(item){
		return b.indexOf(item)<0;
	})

}
ViewRenderer.prototype._arrayJoin=function(a, b){

	return a.concat(b.filter(function(item){
		return a.indexOf(item)<0;
	}))

}

ViewRenderer.prototype._arrayUnique=function(a){

	var o={};
	a.forEach(function(item){
		if(item&&item!=''){
			o[item]='';
		}
	});
	return Object.keys(o);

}


ViewRenderer.prototype._addEnabled = function(el, enabled) {


	var me=this;

		console.log('Check Enabled!')


		if(typeof enabled !="boolean"||typeof enabled !="string"){
			if(!enabled.enabled){
				return;
			}
			enabled=enabled.enabled;
		}



	
		me._bind(enabled, function(v) {

			var value=!!v;
			console.log('Set Enabled! '+(value?"true":"false"));
			if(v){
				me._removeClass(el, 'disabled');
			}else{
				me._addClass(el,'disabled');
			}

			el.isEnabled=!!value;

		});
		
	

}


ViewRenderer.prototype._removeClass = function(el, className) {

	var me=this;
	if(Object.prototype.toString.call(className) == "[object Array]"){
		console.log('Remove Class Names Array: '+JSON.stringify(className));
		className.forEach(function(c){
			me._removeClass(el, c);
		})
		return;
	}


	if(el&&className&&className!==""){

		if(typeof className !="string"){
			if(!className.className){
				return;
			}
			className=className.className;
		}

		console.log('Remove Class: `'+className+'`');

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

	var label = me._createText(field);
	container.addChild(label);
	return label;
}

ViewRenderer.prototype._createText = function(field) {
	var me = this;

	var label = new labelModule.Label();
	me._bind(field.value, function(value) {
		label.text = value
	});

	me._addStyle(label, field);
	me._addClass(label, field);

	label.textWrap = true;

	
	return label;
}


ViewRenderer.prototype._getMediaViewRenderer = function(container, field) {
	var me=this;
	if(!me._mediaViewRenderer){
		var MediaViewRenderer = require('../').MediaViewRenderer
		me._mediaViewRenderer=new MediaViewRenderer();
	}
	return me._mediaViewRenderer;
}

ViewRenderer.prototype._getMapViewRenderer = function(container, field) {
	var me=this;
	if(!me._mapViewRenderer){
		var MapViewRenderer = require('../').MapViewRenderer
		me._mapViewRenderer=new MapViewRenderer();
	}
	return me._mapViewRenderer;
}

ViewRenderer.prototype.renderVideoPlayer = function(container, field) {

	var me=this;
	return me._getMediaViewRenderer().renderVideoPlayer(container, field);
}

ViewRenderer.prototype.renderInlineVideoPlayer = function(container, field) {

	var me=this;
	return me._getMediaViewRenderer().renderInlineVideoPlayer(container, field);
}


ViewRenderer.prototype.renderAudioPlayer = function(container, field) {

	var me=this;
	return me._getMediaViewRenderer().renderAudioPlayer(container, field);
}


ViewRenderer.prototype.renderMediaPicker = function(container, field) {
	var me=this;
	return me._getMediaViewRenderer().renderMediaPicker(container, field);
}


ViewRenderer.prototype.renderAudioRecorder = function(container, field) {
	var me=this;
	return me._getMediaViewRenderer().renderAudioRecorder(container, field);
}


ViewRenderer.prototype.renderMap= function(container, field) {
	var me=this;
	return me._getMapViewRenderer().renderMap(container, field);
}

var renderHtml = function(container, field) {



	var htmlView = new htmlViewModule.HtmlView();
	htmlView.html = instance._parse(field.value);
	container.addChild(htmlView);

}


ViewRenderer.prototype.renderLocation = function(container, field) {

	var me = this;

	var model=me._model;
	if (field.field) {
		console.log('Render location field');
		model.set(field.name, [0, 0]);
		me.renderField(container, field.field);
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


	global.submitForm(function(data){
		console.log('set form data after submit');
		Object.keys(data).forEach(function(k){
			me._model.set(k, data[k]);
		});

		
	});
}

ViewRenderer.prototype.cancel = function() {

	var me = this;

	var topmost = frameModule.topmost();
	//global.setFormData(me.getCurrentFormData());
	me._popSubform();
	console.log('Cancel');


	topmost.goBack();
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



ViewRenderer.prototype.renderButton = function(container, field) {

	var me = this;



	var button = new buttonModule.Button();
	//button.text = field.label;

	me._bind(field.label, function(value) {
		button.text = value
	});


	me._addEnabled(button, field);

	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";

	if (field.image) {
		var image = renderImage(stackLayout, field);
		me._addClass(image, "button-image");
	}

	container.addChild(stackLayout);

	stackLayout.addChild(button);

	if (field.action) {

		console.log('Apply Tap');
		//me.applyTapAction(stackLayout, field, model); //already done by renderImage
		me.applyTapAction(button, field);

	} else {

		console.log("There is no tap action for field: " + JSON.stringify(field, null, "   "));
	
	}

	me._addClass(button, field);


	return button;
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

	instance._parse(field.icons, field.template).forEach(function(icon) {

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


var renderImage = function(container, field) {



	var image = instance._createImage(field);
	container.addChild(image);

	if(field.action){
		instance.applyTapAction(image, field);
	}

	instance._addClass(image, field);


	var gestures = require("ui/gestures");
	image.on(gestures.GestureTypes.pinch, function (args) {
	    console.log("Pinch Scale: " + JSON.stringify(args));
	});


	return image;
}



ViewRenderer.prototype._createImage = function(field) {

	var me=this;

	var url=field;
	if(field.image){
		url=field.image;
	}



	if(typeof url =='function'){
		url=url();
	}

	if(Object.prototype.toString.call(url) == "[object Array]"&&url.length==1&&typeof url[0]=="string"){
		url=url[0];
	 }

	if(me._isImageAsset(url)){
		return me._imageFromImageAsset(url);
	}

	if(typeof url=='string'&&url.indexOf('{')>=0){
		 url = me._parse(url);
		 console.log('Variable Image: '+src);

		 
	}

	if(Object.prototype.toString.call(url) == "[object Array]"&&url.length==1&&typeof url[0]=="string"){
		 	/**
		 	 * support for using core-app imageset image which is always an array with image url at 0 (possibly multiple images...);
		 	 * @type {[type]}
		 	 */
			url=url[0];
		 }

	if(me._isLocalFileAsset(url)){
		return me._imageFromLocalFileAsset(url);
	}


	var src = url;

	if(typeof src !="string"){
		throw 'Expected image src to be a string '+src+(typeof src);
	}
		
		


	if (src[0] !== "~") {
		src = 'https://' + global.client.getUrl() + "/" + src;
	}




	if(field.size&&src.indexOf('https://')===0){
		src=me._getImageThumb(src, field);
	}


	var image = new imageModule.Image();
	console.log('set image: '+src);
	image.src = src;
	return image;
}




ViewRenderer.prototype._getImageThumb = function(url, size) {
	if(size.size){
		size=size.size;
	}

	return url.split('?')[0]+'?thumb='+size.w+'x'+size.h;

}



ViewRenderer.prototype.renderButtonset = function(container, field, model) {

	var me=this;

	var buttons = [];


	var wrapLayout = new wrapLayoutModule.WrapLayout();

	me._addClass(wrapLayout, "buttonset");
	me._addClass(wrapLayout, field);


	container.addChild(wrapLayout);

	

	field.buttons.forEach(function(button) {

		var btnEl=me.renderButtonsetButton(wrapLayout, button);
		//buttons.push(btnEl);	

		me._addEnabled(btnEl, button);

		me.applyTapAction(btnEl,function(){
			me._setSelected(btnEl, button, buttons);
		});

	});


	//console.log(buttons);
	return wrapLayout;

}

ViewRenderer.prototype._clearSelected = function(buttons) {
	var me=this;
	buttons.forEach(function(b) {
		me._removeClass(b, "selected");
	});
}


ViewRenderer.prototype._isImageAsset=function(asset){

	if(asset&&(typeof asset)!="string"){
		console.log('is image asset')
		return true;
	}else{
		return false;
	}
}
ViewRenderer.prototype._imageFromImageAsset=function(asset){
	var image = new imageModule.Image();
	console.log('Set Image From Asset '+asset);
	image.src = asset;
	return image;
}
ViewRenderer.prototype._isLocalFileAsset=function(asset){
	if(typeof asset=="string"){
		var filepath=asset;
		var fs = require("file-system");

		if(filepath.indexOf('/')<0){
			var savepath = fs.knownFolders.documents().path;
			filepath = fs.path.join(savepath, asset);
		}
    	
    	return fs.File.exists(filepath);
	}
	return false;
}

ViewRenderer.prototype._imageFromLocalFileAsset=function(asset){
	if(typeof asset=="string"){
		var filepath=asset;

		if(filepath.indexOf('/')<0){
			var fs  = require("file-system");
			var savepath = fs.knownFolders.documents().path;
			filepath = fs.path.join(savepath, asset);
		}
    	
    	var image = new imageModule.Image();
		image.src = filepath;
		return image;
	}
	throw 'Expected file path: '+(typeof asset);
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


		if (field.icon) {
			var icon=field.icon;

			if(typeof icon=='string'&&icon[0]=="{"){
				icon=me._createImage(icon);
				stackLayout.addChild(icon);
			
				if(field.label){
					renderLabel(imageStack, {
						value: field.label
					});
				}
				return stackLayout;
			}
			
			if(me._isImageAsset(icon)){
				console.log('Assume that field.icon is an imageAsset');
				var image = me._imageFromImageAsset(icon);
				stackLayout.addChild(image);
			
				if(field.label){
					renderLabel(imageStack, {
						value: field.label
					});
				}
				return stackLayout;
			}	
			



			getConfiguration().getImage(icon)

				.then(function(imgPath) {

					console.log('Got Buttonset Image path')

					var image = new imageModule.Image();
					image.src = imgPath;
					stackLayout.addChild(image);

					if(field.label){
						renderLabel(imageStack, {
							value: field.label
						})
					}
					


				
				})
				.catch(function(err) {
					console.log("Field Button Error: " + err);
					//Still render the label.
					renderLabel(imageStack, {
						value: field.label
					})
				});

		} else {

			me.renderButton(stackLayout, field);
		}
		
		return stackLayout;



}


/**
 * add Tap event Handler for element. 
 * action can be a string, or object with key `action`.
 * if action='event'` then must be {"action":"event", "event":"someEventName"}
 */

ViewRenderer.prototype.applyTapAction = function(button, action) {


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
			action(me.getCurrentFormData(), button);
		});

		return;

	}


	if (action == 'submit') {
		button.on(buttonModule.Button.tapEvent, function() {

			me.submit(field.back);

		});

		return
	}
	if (action == 'data'&&field.data) {
		button.on(buttonModule.Button.tapEvent, function() {
			Object.keys(field.data).forEach(function(k){
				me._model.set(k, field.data[k]);
			})
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

	if (action == 'form'||action == 'view') {
		button.on(buttonModule.Button.tapEvent, function() {
			var topmost = frameModule.topmost();

			var contextOptions = extend({}, field); //JSON.parse(JSON.stringify(field));
			if (field.name) {
				contextOptions.form = contextOptions.form || field.name;
			}
			if(contextOptions.data&&typeof contextOptions.data=='string'){
				contextOptions.data=me._parse(contextOptions.data);
			}

			topmost.navigate({
				moduleName: "views/form/form",
				context: contextOptions

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

ViewRenderer.prototype._setSelected = function(button, field, buttons) {

	var me=this;

	if(buttons){
		me._clearSelected(buttons);
	}	


	console.log('Tap');
	
	

	if (typeof field.action == 'function') {
		
		field.action(me.getCurrentFormData(), button);
		

		return;
	}


	if (field.action == 'form') {



		setTimeout(function() {
			var topmost = frameModule.topmost();

			var contextOptions = extend({}, field); //JSON.parse(JSON.stringify(field));
			if (field.name) {
				contextOptions.form = contextOptions.form || field.name;

			}

			topmost.navigate({
				moduleName: "views/form/form",
				context: contextOptions
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

ViewRenderer.prototype.renderStyle = function(container, field) {

	var me=this;
	getConfiguration().getStyle(field.stylename)

	.then(function(stylePath) {


			console.log(stylePath);
			me._page.addCssFile(stylePath);

		})
		.catch(function(err) {
			console.log("Render Style Error: " + err);
		});

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
	var current=me._model;
	me._clearUpdateIntervals();
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

	me._addClass(button, "subform");
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






ViewRenderer.prototype.renderScroll = function(container, fields, model) {
	var me = this;

	console.log(scrollViewModule.ScrollView);
	var scrollView = new scrollViewModule.ScrollView();
	scrollView.orientation = "horizontal";
	var stackLayout = new stackLayoutModule.StackLayout();
	stackLayout.orientation = "horizontal";
	container.addChild(scrollView);
	scrollView.content = stackLayout;
	me._renderFields(stackLayout, fields.fields);

}

ViewRenderer.prototype._renderFields = function(container, fields) {
	
		var me = this;

		if(fields&&(fields._domId||fields.ios||fields.android)){

			container.addChild(fields);
			return [fields];
		}


		if((Object.prototype.toString.call(fields) == "[object Object]")){
			fields=[fields];
		}

		if(Object.prototype.toString.call(fields) == "[object Array]") {
			//console.log('Create StackLayout Array "right" '+JSON.stringify(right));
			var elements=[];
			fields.forEach(function(field) {
				elements.push(me.renderField(container, field));
			});
			return elements;

		}
	
		return [];


	
}
ViewRenderer.prototype.renderFieldset = function(container, fields) {
	var me = this;

	var stack=_createStack();
	container.addChild(stack);


	me.renderFields(stack, fields);
	
	return stack;
}

ViewRenderer.prototype.renderLayout = function(container, field) {


	var me=this;

	// <FlexboxLayout flexDirection="row" class="bottom-bar" id="bottom" flexShrink="0">
	// 		<StackLayout id="bottom-left" orientation="horizontal">
	// 	    </StackLayout>
	// 	    <StackLayout id="bottom-center" flexGrow="1" orientation="horizontal">
	// 	    </StackLayout>
	// 	    <StackLayout id="bottom-right" orientation="horizontal">
	// 	    </StackLayout>
	// 	</FlexboxLayout>
	// 	
	// 	
	// 	

	var FlexboxLayout = require("ui/layouts/flexbox-layout").FlexboxLayout;
	var flexbox = new FlexboxLayout();
	container.addChild(flexbox);
	//FlexboxLayout.setFlexShrink();

	var name=field.name||'flexbox-bar';
	var template=field.template||'flexbox';

	var left=_createStack();
	var center=_createStack();
	var right=_createStack();

	FlexboxLayout.setFlexGrow(center, 1);

	
	left.orientation = "horizontal";
	center.orientation = "horizontal";
	right.orientation = "horizontal";

	left.id = name+"-left";
	center.id = name+"-center";
	right.id = name+"-right";

	flexbox.addChild(left);
	flexbox.addChild(center);
	flexbox.addChild(right);

	
	me._renderFields(left, field.left);
	me._renderFields(right, field.right);
		

	me._addClass(flexbox, field);


	return flexbox;

}

ViewRenderer.prototype._renderConditionalFieldset = function(container, field) {
	var me = this;

	var stack=_createStack();
	container.addChild(stack);


	

	me._addClass(stack,"conditional");



	var elements=null;
	var bindings=null;
	var intervals=null;

	var hide=function(){
		//unbind
			console.log('remove feildset items');
			elements.forEach(function(e){
				//stack.removeChild(e);
				if(e&&e.parent){
					e.parent.removeChild(e);
				}
			})
			elements=null;
			if(bindings){
				me._removeEventListeners(bindings);
				bindings=null;
			}
			if(intervals){
				me._clearUpdateIntervals(intervals);
				intervals=null;
			}

			me._removeClass(stack,"active");
	}

	me._bind(field.condition, function(value){

		if((!!value)&&elements===null){

			intervals=me._watchIntervalBindings(function(){
				bindings=me._watchEventBindings(function(){
					elements=me._renderFields(stack, field.fields);
				});
			})
			

			me._addClass(stack,"active");
			
		}

		if((!value)&&elements&&elements.length){
			hide();
		}
		
	});



	var gestures = require("ui/gestures");
	if(field.swipe){

	
		stack.on(gestures.GestureTypes.swipe, function (args) {
			if(Object.prototype.toString.call(field.swipe) == "[object Object]"){
				Object.keys(field.swipe).forEach(function(k){
					me._model.set(k, field.swipe[k]);
				})
			}
			if(field.swipe=="hide"){
				hide();
			}
		  
		});
	}
	

	
}

ViewRenderer.prototype.getElementById = function(id) {
	var me=this;
	return me._page.getViewById(id);

}

ViewRenderer.prototype.renderField = function(defaultParentNode, field) {


	var me = this;
	var model=me._model;

	if (!field) {
		throw 'Requires a field!'
	}

	var container = defaultParentNode;
	if (field.position) {
		var node = me.getElementById(field.position);
		if (node) {
			container = node;
		}


		if(container!==defaultParentNode){
			var eventName="insertAt"+field.position[0].toUpperCase()+field.position.split('-').shift().substring(1);
			console.log('Insert Event: '+eventName);

			var eventData = {
				eventName: eventName,
				object: me
			};
			me.notify(eventData);
		}
	}

	
	


	if (!field.type) {
		throw 'Field must have a type! ' + JSON.stringify(field, null, "   ")
	}

	if (field.condition&&field.type!='fieldset') {

		
			if(!me._parse(field.condition)){
				return null;
			}
		

		

	}

	if (field.type == 'heading') {
		return renderHeading(container, field, model);

	}

	if (field.type == 'label') {
		return renderLabel(container, field, model);
	
	}

	if (field.type == 'media') {
		return me.renderMediaPicker(container, field);
	}


	if (field.type == 'audiorecorder') {

		return me.renderAudioRecorder(container, field);
	}
	if (field.type == 'audio') {
		return me.renderAudioPlayer(container, field);
	}
	if (field.type == 'video') {
		return me.renderVideoPlayer(container, field);
	}
	if (field.type == 'inlinevideo') {
		return me.renderInlineVideoPlayer(container, field);
	}

	if (field.type == 'textfield') {
		return renderTextField(container, field, model);
	}

	if (field.type == 'optionlist') {
		return renderOptionList(container, field, model);
	}
	if (field.type == 'boolean') {
		return renderBoolean(container, field, model);
	}

	if (field.type == 'iconselect') {
		return renderIconselect(container, field, model);

	}


	if (field.type == 'space') {
		return renderSpace(container, field, model);
	}

	if (field.type == 'location') {
		return me.renderLocation(container, field, model);

	}

	if (field.type == 'form') {
		return me.renderForm(container, field, model);

	}

	if (field.type == 'button') {
		return me.renderButton(container, field, model);

	}

	if (field.type == 'buttonset') {
		return me.renderButtonset(container, field, model);

	}

	if (field.type == 'progressbar') {
		 return renderProgressBar(container, field, model);

	}

	if (field.type == 'style') {
		return me.renderStyle(container, field);

	}
	if (field.type == 'scroll') {
		return me.renderScroll(container, field, model);

	}
	if (field.type == 'image') {
		return renderImage(container, field);

	}
	
	if (field.type == 'html') {
		return renderHtml(container, field);

	}

	if (field.type == 'list') {
		return me.renderList(container, field);
	}
	if (field.type == 'split') {
		return me.renderSplit(container, field);
	}

	if (field.type == 'layout') {
		return me.renderLayout(container, field);
	}

	if (field.type == 'fieldset') {

		if(field.condition){
			return me._renderConditionalFieldset(container, field);
		}else{
			return me.renderFieldset(container, field.fields);
		}

	}

	


	if (field.type == 'map') {
		me.renderMap(container, field);
		return;
	}

	if (field.type == 'data') {
		Object.keys(field.data).forEach(function(k) {
			console.log('add form data: ' + k + ' ' + field.data[k]);
			model.set(k, field.data[k]);
		});
		return;
	}

	throw 'Unknown field type: ' + field.type + ': ' + JSON.stringify(field);

}

ViewRenderer.prototype.hasView = function(formName) {

	var me=this
	var forms = global.parameters.views;

	if (typeof forms == 'string' && forms[0] == "{") {
		forms = me._parse(forms);
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


	//console.log("Current Form Data: " + JSON.stringify(data, null, "   "));
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

ViewRenderer.prototype.renderView = function(page, model, fields) {

	var me = this;
	me._model = model;
	me._page = page;


	model.set('isSubmitting', false);
	model.set('submittingStateLabel', '');


	page.on('navigatedTo',function(arg){
		console.log('Navigated To '+JSON.stringify(Object.keys(arg)));
	})
	page.on('navigatedFrom',function(arg){
		console.log('Navigated From'+JSON.stringify(Object.keys(arg)));
		console.log('Navigated From'+JSON.stringify(arg.context));
		console.log('Navigated From'+JSON.stringify(arg.isBackNavigation));
		console.log('Navigated From'+JSON.stringify(Object.keys(arg.object)));

		if(arg.isBackNavigation){
			me._clearUpdateIntervals();
		}
	})



	model.on(require("data/observable").Observable.propertyChangeEvent, function(data) {
		console.log('on ' + data.propertyName + ' changed: ' + JSON.stringify(data.value));
		// console.log('Property Changed '+JSON.stringify(data));
		// console.log('Properties '+JSON.stringify(page.bindingContext));
	});


	page.bindingContext = model;


	var context = page.navigationContext;
	console.log('Rendering view with context: ' + JSON.stringify(context, null, "   "));
	var container = page.getViewById("container");

	var formName = "main";
	if (context) {
		if (context.view||context.form) {
			formName =context.view||context.form;
		}
		if (context.events) {
			Object.keys(context.events).forEach(function(e) {
				me.on(e, context.events[e]);
			});
		}

		if (context.data) {
			Object.keys(context.data).forEach(function(k) {
				console.log('add form context data: ' + k + ' ' + context.data[k]);
				model.set(k, context.data[k]);
			});
		}
	}

	me._viewName = formName;

	me._addClass(container, "form-" + formName)
	me._addClass(page, formName+"-view");
	me._addClass(page, require("application").android?"android":"ios");



	var elements = [];
	if(fields){
		elements = fields
	}else if (context.fields) {
		elements = context.fields
	} else {

		//backward compatibility for bcwf. parameters.forms!
		var forms = global.parameters.views || global.parameters.forms;

		if (typeof forms == 'string' && forms[0] == "{") {
			forms = me._parse(forms);
		}

		elements = forms[formName];
	}


	if (typeof elements == 'string' && elements[0] == "{") {
		elements = me._parse(elements);
	}

	if (!elements) {
		throw 'Invalid form fields: (' + (typeof elements) + ') for ' + formName;
	}

	me._renderFields(container, elements);

	var data = global.getFormData();
	me.setCurrentFormData(data);
	me.getCurrentFormData();


	var eventData = {
		eventName: "renderedView",
		object: this
	};

	me.notify(eventData);

}




/**
 * List View Renderer!
 */



ViewRenderer.prototype._getListViewRenderer = function() {
	var me=this;
	if(!me._listViewRenderer){
		var ListViewRenderer = require('../').ListViewRenderer;
		me._listViewRenderer=new ListViewRenderer();
	}
	return me._listViewRenderer;
}
ViewRenderer.prototype.renderSplit = function(container, field) {
	var me=this;
	return me._getListViewRenderer().renderSplit(container, field);
}

ViewRenderer.prototype.renderList = function(container, field) {
	var me=this;
	return me._getListViewRenderer().renderList(container, field);
}

ViewRenderer.prototype.setListResolver = function(name, fn) {
	var me=this;
	return me._getListViewRenderer().setListResolver(name, fn);
}





ViewRenderer.prototype._createStack = function(items) {

	var me=this;
	//console.log('Create StackLayout');
	var stackLayout = new stackLayoutModule.StackLayout();

	if(items){
		items.forEach(function(item){

			if((item._domId||item.ios||item.android)){
				stackLayout.addChild(item);
				return;
			}
			if((Object.prototype.toString.call(item) == "[object Object]")){
				me.renderField(stackLayout, item);
				return;
			}
			throw 'Unknown item _createStack(item): '+item;
			
		})
	}

	return stackLayout;
}

var _createStack = function(items) {
	return instance._createStack(items);
}




module.exports = ViewRenderer;