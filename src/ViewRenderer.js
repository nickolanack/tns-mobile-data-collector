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

var SocialShare;
var PullToRefresh;

var textViewModule;
var activityIndicatorModule;


function ViewRenderer() {

	if(instance){
		throw 'Singleton shared class should be accessed by calling ViewRenderer.SharedInstance()';
	}

	var me = this;

	labelModule = require("ui/label");
	textFieldModule = require("ui/text-field");


	activityIndicatorModule = require("ui/activity-indicator");

	textViewModule = require("ui/text-view");
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
	SocialShare = require("nativescript-social-share");

	try{
		PullToRefresh = require("nativescript-pulltorefresh").PullToRefresh
	}catch(e){
		console.log('Unable to use PullToRefresh')
	}

	if (instance) {
		throw 'Singleton class instance has already been created! use ViewRenderer.SharedInstance()';
	}
	instance = me;


};



ViewRenderer.SharedInstance = function() {

	if (!instance) {
		
		instance=new ViewRenderer();
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


/**
 * Default style (url) applied to all views rendered
 */
ViewRenderer.prototype.setDefaultStyle=function(styleUrl){
	this._styleUrl=styleUrl;
}


ViewRenderer.prototype.once=function(name, event){
	var me=this;
	var fn=function(){
		me.removeEventListener(name, fn);
		event.apply(null, arguments);
	}
	me.on(name, fn)
}

ViewRenderer.prototype._renderDefaultStyle=function(){
	if(this._styleUrl){
		this.renderStyle(this._styleUrl);
	}
}


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
		me._template = Template.SharedInstance();
	}
	return me._template;
}
ViewRenderer.prototype._parse = function(template, formatter, params) {


	var me = this;

	if (!params) {
		params = me._params();
	}

	return me._getParser().render(template, params, formatter);

}

ViewRenderer.prototype._params = function(model) {

	var me = this;

	var params = JSON.parse(JSON.stringify(me._config().getDefaultParameters()));
	params.data = JSON.parse(JSON.stringify(me.getActiveViewData(model)));
	return params;

}



ViewRenderer.prototype._bind = function(str, callback) {

	var me = this;

	if(!me._shouldParse(str)){
		callback(str);
		return;
	}

	callback(me._parse(str));
	if (me._shouldBindToData(str)) {
		me._bindToDataChangeEvents(str, callback);
	}

}



ViewRenderer.prototype._hasFormDataTemplate = function(str) {
	return str.indexOf('{data.') >= 0;
}

ViewRenderer.prototype._shouldParse = function(str) {
	return str.indexOf('{') >= 0&&str.indexOf('}') >= 0;
}
ViewRenderer.prototype._shouldBindToData = function(str) {
	var me = this;
	if (me._shouldParse(str)&&(me._hasFormDataTemplate(str) || me._getParser().hasTemporalFormatter(str))) {
		return true;
	}
}

ViewRenderer.prototype._bindToDataChangeEvents = function(str, callback) {

	var me = this;
	var model = me._model;



	if (me._hasFormDataTemplate(str)) {

		me._addUpdateEventListener(str, function(data) {
			callback(me._parse(str, null, me._params(model)));
		})

	}

	if (me._getParser().hasTemporalFormatter(str)) {
		me._addUpdateInterval(str, function() {
			var val = me._parse(str, null, me._params(model));
			//onsole.log('Update temporally bound item: '+val);
			callback(val);
		}, 1000);
	}

}

ViewRenderer.prototype._addUpdateEventListener = function(str, eventFn) {
	var me = this;
	var model = me._model;
	model.on(require("data/observable").Observable.propertyChangeEvent, eventFn);

	if (!me._eventListeners) {
		me._eventListeners = [];
	}
	me._eventListeners.push(eventFn);

}

ViewRenderer.prototype._removeEventListeners = function(list) {
	var me = this;
	console.log('Clear Events');
	var events = (list || me._eventListeners || []);
	events.forEach(function(eventFn) {
		me._model.removeEventListener(require("data/observable").Observable.propertyChangeEvent, eventFn);
	});

	if (list && me._eventListeners) {
		list.forEach(function(e) {
			var i = me._eventListeners.indexOf(e);
			if (i >= 0) {
				me._eventListeners.splice(i, 1);
			}
		})
	} else {
		me._eventListeners = [];
	}

}


ViewRenderer.prototype._watchEventBindings = function(fn) {

	var me = this;
	var l = 0;
	if (me._eventListeners) {
		l = me._eventListeners.length;
	}

	fn();

	if (me._eventListeners) {
		return me._eventListeners.slice(l);
	}
	return [];

}

ViewRenderer.prototype._watchIntervalBindings = function(fn) {

	var me = this;
	var l = 0;
	if (me._intervals) {
		l = me._intervals.length;
	}

	fn();

	if (me._intervals) {
		return me._intervals.slice(l);
	}
	return [];

}



ViewRenderer.prototype._addUpdateInterval = function(name, fn, time) {
	var me = this;
	var interval = setInterval(fn, time);

	/**
	 * TODO: manage intervals gracefully on page transistions.
	 */

	if (!me._intervals) {
		me._intervals = [];
	}

	me._intervals.push([name, interval, fn, time]);

}

ViewRenderer.prototype._clearUpdateIntervals = function(list) {
	var me = this;
	console.log('Clear Update Intevals');

	var intervals = list || me._intervals || [];

	if (me._intervals) {
		me._intervals.forEach(function(item) {
			console.log('Clear: ' + item[0] + ' ' + item[2].toString());
			clearInterval(item[1]);
		});
	}


	if (list && me._intervals) {
		list.forEach(function(e) {
			var i = me._intervals.indexOf(e);
			if (i >= 0) {
				me._intervals.splice(i, 1);
			}
		})
	} else {
		me._intervals = [];
	}
}


ViewRenderer.prototype._addDataChangeEvents = function(str, callback) {
	var me = this;
	me._model.on(require("data/observable").Observable.propertyChangeEvent, function(data) {
		callback(me._parse(str));
	});
}



ViewRenderer.prototype._addStyle = function(el, field) {
	if (el && field && field.style) {
		el.style = field.style;
	}


}

/**
 * adds class name to element, and if classname contains 
 * bindable string template then it is bound to that variable.
 * 
 */
ViewRenderer.prototype._addClass = function(el, className) {


	var me = this;

	if (el && className && className !== "") {

		if (typeof className != "string") {
			if (!className.className) {
				return;
			}
			className = className.className;
		}



		var last = [];
		me._bind(className, function(value) {

			var current = me._arrayUnique(value.split(' '));

			if (last.length) {
				var diff = me._arrayDiff(last, current);
				console.log("Removing Classname Diff `"+className+"`: " + JSON.stringify(last) + ' ' + JSON.stringify(current) + ' -> ' + JSON.stringify(diff));
				me._removeClass(el, diff);
			}

			last = current;


			var classNames = me._arrayUnique(el.className ? el.className.split(' ') : []);
			el.className = me._arrayJoin(classNames, current).join(' ');

		});

	}


}


ViewRenderer.prototype._arrayDiff = function(a, b) {

	return a.filter(function(item) {
		return b.indexOf(item) < 0;
	})

}
ViewRenderer.prototype._arrayJoin = function(a, b) {

	return a.concat(b.filter(function(item) {
		return a.indexOf(item) < 0;
	}))

}

ViewRenderer.prototype._arrayUnique = function(a) {

	var o = {};
	a.forEach(function(item) {
		if (item && item != '') {
			o[item] = '';
		}
	});
	return Object.keys(o);

}


ViewRenderer.prototype._addEnabled = function(el, enabled) {


	var me = this;

	console.log('Check Enabled!')


	if (typeof enabled != "boolean" || typeof enabled != "string") {
		if (!enabled.enabled) {
			return;
		}
		enabled = enabled.enabled;
	}



	me._bind(enabled, function(v) {

		var value = !!v;
		console.log('Set Enabled! ' + (value ? "true" : "false"));
		if (v) {
			me._removeClass(el, 'disabled');
		} else {
			me._addClass(el, 'disabled');
		}

		el.isEnabled = !!value;

	});



}

var _isArray = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Array]";
}
var _isObject = function(thing) {
	return Object.prototype.toString.call(thing) === "[object Object]";
}

ViewRenderer.prototype._removeClass = function(el, className) {

	var me = this;
	if (_isArray(className)) {
		console.log('Remove Class Names Array: ' + JSON.stringify(className));
		className.forEach(function(c) {
			me._removeClass(el, c);
		})
		return;
	}


	if (el && className && className !== "") {

		if (typeof className != "string") {
			if (!className.className) {
				return;
			}
			className = className.className;
		}

		console.log('Remove Class: `' + className + '`');

		var classNames = (el.className ? el.className : "").split(' ');
		var index = classNames.indexOf(className)
		if (index >= 0) {
			classNames.splice(index, 1);
			el.className = classNames.join(' ');
		}
	}


}



var renderHeading = function(container, field) {
	return instance.renderHeading(container, field);
}

ViewRenderer.prototype.renderHeading = function(container, field) {

	var me = this;
	var label = me.renderText(container, field);
	me._addClass(label, "heading");

	return label;

}

var renderLabel = function(container, field) {
	return instance.renderLabel(container, field);
}
ViewRenderer.prototype.renderLabel = function(container, field) {

	var me = this;
	var label = me.renderText(container, field);
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

		if(field.placeholder){
			if((!value)||value==""){
				label.text=field.placeholder;
				me._addClass(label, 'placeholder-text')
				return;
			}else{
				me._removeClass(label, 'placeholder-text')
			}
		}

		label.text = value
	});

	me._addStyle(label, field);
	me._addClass(label, field);

	label.textWrap = true;


	return label;
}


ViewRenderer.prototype._getARViewRenderer = function(container, field) {
	var me = this;
	if (!me._arViewRenderer) {
		var ARViewRenderer = require('../').ARViewRenderer;
		me._arViewRenderer = new ARViewRenderer();
	}
	return me._arViewRenderer;
}


ViewRenderer.prototype.renderARView = function(container, field) {

	var me = this;
	return me._getARViewRenderer().renderARView(container, field);
}




ViewRenderer.prototype._getMediaViewRenderer = function(container, field) {
	var me = this;
	if (!me._mediaViewRenderer) {
		var MediaViewRenderer = require('../').MediaViewRenderer
		me._mediaViewRenderer = new MediaViewRenderer();
	}
	return me._mediaViewRenderer;
}

ViewRenderer.prototype._getMapViewRenderer = function(container, field) {
	var me = this;
	if (!me._mapViewRenderer) {
		var MapViewRenderer = require('../').MapViewRenderer
		me._mapViewRenderer = new MapViewRenderer();
	}
	return me._mapViewRenderer;
}

ViewRenderer.prototype.renderVideoPlayer = function(container, field) {

	var me = this;
	return me._getMediaViewRenderer().renderVideoPlayer(container, field);
}

ViewRenderer.prototype.renderInlineVideoPlayer = function(container, field) {

	var me = this;
	return me._getMediaViewRenderer().renderInlineVideoPlayer(container, field);
}


ViewRenderer.prototype.renderAudioPlayer = function(container, field) {

	var me = this;
	return me._getMediaViewRenderer().renderAudioPlayer(container, field);
}


ViewRenderer.prototype.renderMediaPicker = function(container, field) {
	var me = this;
	return me._getMediaViewRenderer().renderMediaPicker(container, field);
}


ViewRenderer.prototype.renderAudioRecorder = function(container, field) {
	var me = this;
	return me._getMediaViewRenderer().renderAudioRecorder(container, field);
}


ViewRenderer.prototype.renderMap = function(container, field) {
	var me = this;
	return me._getMapViewRenderer().renderMap(container, field);
}

var renderHtml = function(container, field) {



	var htmlView = new htmlViewModule.HtmlView();
	htmlView.html = '<body style="font-family:sans-serif;">'+instance._parse(field.value)+'</body>';
	container.addChild(htmlView);

}


ViewRenderer.prototype.renderLocation = function(container, field) {

	var me = this;

	var model = me._model;
	if (field.field) {
		console.log('Render location field');
		model.set(field.name, [0, 0]);
		me.renderField(container, field.field);
	}

	var Accuracy=require('ui/enums').Accuracy;

	me._app().requireAccessToGPS().then(function(geolocation) {

		var currentWatchObserverNumber=null;

		me.once('pop',function(){
			console.log('Clear Geolocation Interval');
			geolocation.clearWatch(currentWatchObserverNumber);		
		})
		console.log('Requesting location');

		

		currentWatchObserverNumber=geolocation.watchLocation(
			function(loc) {

				if (loc) {
					console.log("Current location is: " + JSON.stringify(loc));
					model.set(field.name, [loc.latitude, loc.longitude, loc.altitude]);
				}

			},
			function(e) {
				console.log("Location Error: " + JSON.stringify(e.message||e));
				//getLocation();
			}, {
				desiredAccuracy: Accuracy.any,
				updateDistance: 1,
				minimumUpdateTime: 1000 * 10
			});



		geolocation.getCurrentLocation({ desiredAccuracy: Accuracy.high, maximumAge: 5000, timeout: 20000 }).then(function(loc){
			if (loc) {
				console.log("Current location is: " + JSON.stringify(loc));
				model.set(field.name, [loc.latitude, loc.longitude, loc.altitude]);
			}
		}).catch(function(e){
			console.log("Location Error: "+JSON.stringify(e.message||e))
		});

	}).catch(function(e){
		console.log("Location Error: "+JSON.stringify(e.message||e))
	})


}


ViewRenderer.prototype.renderOrientation = function(container, field) {

		
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
	me._setFormData(me.getActiveViewData());
	me._popSubform();


	var n = num || 1;
	while (n > 0) {
		topmost.goBack();
		topmost = frameModule.topmost();
		n--;
	}
}

ViewRenderer.prototype.setSubmitHandler = function(handler) {
	this._submitHandler=handler;
}

ViewRenderer.prototype.submit = function(field) {

	var me = this;
	var num=field;
	if(num.back){
		num=num.back;
	}

	me._setFormData(me.getActiveViewData());

	var n = num || 0;
	while (n > 0) {
		me._popSubform();
		me._setFormData(me.getActiveViewData());
		n--;
	}

	var fieldData={};
	if(field.data){
		fieldData=JSON.parse(JSON.stringify(field.data));
	}



	me._submitHandler(extend(fieldData, me.getFormData()), field.name||me.currentView(), function(data) {

	

		me._clearSubforms();

		console.log('set form data after submit');
		Object.keys(data).forEach(function(k) {
			me._model.set(k, data[k]);
		});
	});
}

ViewRenderer.prototype._clearSubforms = function() {
	var me=this;
		me._lazyFilledFormDataMap={};
		me._models = [];
		me._viewNames = [];
		me._namedViewStack=[];
		me.subFormsCallbacks = {};
}

ViewRenderer.prototype.cancel = function() {

	var me = this;

	var topmost = frameModule.topmost();
	//global.setFormData(me.getActiveViewData());
	me._popSubform();
	console.log('Cancel');


	topmost.goBack();
}



ViewRenderer.prototype.renderTextField = function(container, field) {

	var me=this;
	var model=me._model;

	var textfield = new textFieldModule.TextField();

	textfield.returnKeyType='done';

	if(field.placeholder){
		textfield.hint = field.placeholder;
	}
	

	instance._addClass(textfield, "textfield")
	var bindingOptions = {
		sourceProperty: field.name,
		targetProperty: "text",
		twoWay: true
	}

	textfield.bind(bindingOptions, model);
	model.set(field.name, model.get(field.name)||"");

	if(field.value){
		textfield.text=field.value;
		model.set(field.name, field.value);
	}

	container.addChild(textfield);

}
ViewRenderer.prototype.renderTextFieldArea = function(container, field) {


	var me=this;
	var model=me._model;

	var textfield = new textViewModule.TextView();

	textfield.returnKeyType='done';

	if(field.placeholder){
		textfield.hint = field.placeholder;
	}

	instance._addClass(textfield, "textfield")
	var bindingOptions = {
		sourceProperty: field.name,
		targetProperty: "text",
		twoWay: true
	}

	textfield.bind(bindingOptions, model);
	model.set(field.name, model.get(field.name)||"");

	if(field.value){
		textfield.text=field.value;
		model.set(field.name, field.value);
	}

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

	if(!field.label){
		throw 'Expected label in field: '+JSON.stringify(field);
	}

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
		//me.addTapActionListener(stackLayout, field, model); //already done by renderImage
		me.addTapActionListener(button, field);

	} else {

		console.log("There is no tap action for field: " + JSON.stringify(field, null, "   "));

	}

	me._addClass(button, field);


	return button;
}



ViewRenderer.prototype.renderIconselect = function(container, field) {


	var me = this;

	var buttons = [];
	var clearSelected = function() {
		buttons.forEach(function(b) {
			instance._removeClass(b, "selected");
		});
	}

	var wrapLayout = new wrapLayoutModule.WrapLayout();

	instance._addClass(wrapLayout, "iconselect");
	container.addChild(wrapLayout);


	var initialValue=me._model.get(field.name)||field.value;

	instance._parse(field.icons, field.template).forEach(function(icon) {

		var imageStack = new stackLayoutModule.StackLayout();
		wrapLayout.addChild(imageStack);

		var stackLayout = new stackLayoutModule.StackLayout();
		instance._addClass(stackLayout, "icon value-" + icon.value.toLowerCase().split(' ').join('-'));

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
			me._model.set(field.name, icon.value);
			clearSelected();
			instance._addClass(stackLayout, "selected");

		};
		if (icon.value == initialValue) {
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

	if (field.stretch) {
		image.stretch = field.stretch;
	}

	container.addChild(image);

	if (field.action) {
		instance.addTapActionListener(image, field);
	}

	instance._addClass(image, field);


	var gestures = require("ui/gestures");
	image.on(gestures.GestureTypes.pinch, function(args) {
		console.log("Pinch Scale: " + JSON.stringify(Object.keys(args)));
		console.log("Pinch Scale `scale`: " + JSON.stringify(args.scale));
		console.log("Pinch Scale `state`: " + JSON.stringify(Object.keys(args.state)));
	});


	return image;
}



ViewRenderer.prototype._createImage = function(field) {

	var me = this;

	var url = field;
	if (field.image) {
		url = field.image;
	}



	if (typeof url == 'function') {
		url = url();
	}

	if (_isArray(url) && url.length == 1 && typeof url[0] == "string") {
		url = url[0];
	}

	if (me._isImageAsset(url)) {
		return me._imageFromImageAsset(url);
	}

	if (typeof url == 'string' && url.indexOf('{') >= 0) {
		var before=url;
		url = me._parse(url);
		console.log('Variable Image: ' +before+"=>"+ url);


	}

	if (_isArray(url) && url.length == 1 && typeof url[0] == "string") {
		/**
		 * support for using core-app imageset image which is always an array with image url at 0 (possibly multiple images...);
		 * @type {[type]}
		 */
		url = url[0];
	}

	if (me._isLocalFileAsset(url)) {
		console.log('Local File Asset: '+url);
		return me._imageFromLocalFileAsset(url);
	}


	var src = url;

	if (typeof src != "string") {
		throw 'Expected image src to be a string ' + src + (typeof src);
	}



	if (src[0] !== "~"&&src.indexOf('http')!==0) {
		src = global.client.getProtocol() + '://' + global.client.getUrl() + "/" + src;
	}



	
	src = me._getImageThumb(src, field);

	




	
	var image = new imageModule.Image();
	image.loadMode="async";
	//image.src = encodeURI(src);

	me._setCachedImageAsync(src, image);

	return image;

}
ViewRenderer.prototype._setCachedImageAsync = function(url, image) {
	var me=this;

	console.log('Set View Image Async: ' + url);
	var startTime = (new Date()).valueOf()
	if(url.indexOf(global.client.getProtocol() + '://') === 0){

		var config=me._config();
		var hasImage=config.hasCachedImage(url);

		config.getImage(url, url).then(function(path){

			image.src=path;
			console.log('Image Async: '+((new Date()).valueOf()-startTime)+"ms "+path);

		}).catch(function(err){
			console.log('Error caching url: '+JSON.stringify(err)+' '+url);
		});

		if(hasImage){
			return config.cachedImagePath(url);
		}


	}else{
		image.src=url;
	}
	return url;
}


ViewRenderer.prototype._getImageThumb = function(url, field) {


	if(field.size && url.indexOf(global.client.getProtocol() + '://') === 0){


		var size = field.size;
		return url.split('?')[0] + '?thumb=' + size.w + 'x' + size.h;


	}

	return url;


}



ViewRenderer.prototype.renderButtonset = function(container, field) {

	var me = this;

	var buttons = [];


	var wrapLayout = new wrapLayoutModule.WrapLayout();

	me._addClass(wrapLayout, "buttonset");
	me._addClass(wrapLayout, field);


	container.addChild(wrapLayout);



	field.buttons.forEach(function(button) {

		var btnEl = me.renderButtonsetButton(wrapLayout, button);
		//buttons.push(btnEl);	

		me._addEnabled(btnEl, button);

		me.addTapSelectedListener(btnEl, button, buttons);
		

	});


	//console.log(buttons);
	return wrapLayout;

}

ViewRenderer.prototype._clearSelected = function(buttons) {
	var me = this;
	buttons.forEach(function(b) {
		me._removeClass(b, "selected");
	});
}


ViewRenderer.prototype._isImageAsset = function(asset) {

	if (asset && (typeof asset) != "string") {
		console.log('is image asset')
		return true;
	} else {
		return false;
	}
}
ViewRenderer.prototype._imageFromImageAsset = function(asset) {
	var image = new imageModule.Image();
	console.log('Set Image From Asset ' + asset);
	image.src = asset;
	return image;
}
ViewRenderer.prototype._isLocalFileAsset = function(asset) {
	if (typeof asset == "string") {
		var filepath = asset;
		var fs = require("file-system");

		if (filepath.indexOf('/') < 0) {
			var savepath = fs.knownFolders.documents().path;
			filepath = fs.path.join(savepath, asset);
		}

		return fs.File.exists(filepath);
	}
	return false;
}

ViewRenderer.prototype._imageFromLocalFileAsset = function(asset) {
	if (typeof asset == "string") {
		var filepath = asset;

		if (filepath.indexOf('/') < 0) {
			var fs = require("file-system");
			var savepath = fs.knownFolders.documents().path;
			filepath = fs.path.join(savepath, asset);
		}

		var image = new imageModule.Image();
		image.src = filepath;
		return image;
	}
	throw 'Expected file path: ' + (typeof asset);
}



ViewRenderer.prototype.renderButtonsetButton = function(container, field) {

	var me = this;

	var imageStack = new stackLayoutModule.StackLayout();
	container.addChild(imageStack);

	var stackLayout = new stackLayoutModule.StackLayout();

	me._addClass(stackLayout, "bs-btn icon");
	me._addClass(stackLayout, field);


	imageStack.addChild(stackLayout);


	if (field.icon) {
		var icon = field.icon;

		var uiimage=null;

		if (typeof icon == 'string' && (icon[0] == "{"||icon.indexOf('/')>=0)) {
			uiimage = me._createImage(icon);
		}

		if (me._isImageAsset(icon)) {
			console.log('Assume that field.icon is an imageAsset');
			uiimage = me._imageFromImageAsset(icon);
		}


		if(uiimage){
			stackLayout.addChild(uiimage);

			if (field.stretch) {
				uiimage.stretch = field.stretch;
			}


			if (field.label) {
				renderLabel(imageStack, {
					value: field.label
				});
			}

			me.addTapActionListener(stackLayout, field);
			return stackLayout;
		}





		getConfiguration().getImage(icon)

			.then(function(imgPath) {

				//console.log('Got Buttonset Image path: '+imgPath);

				var image = new imageModule.Image();
				image.src = imgPath;
				stackLayout.addChild(image);

				if (field.label) {
					renderLabel(imageStack, {
						value: field.label
					})
				}

				if (field.stretch) {
					image.stretch = field.stretch;
				}



			})
			.catch(function(err) {
				console.log("Field Button Icon From Configuration Variable("+icon+") Error: " + err);
				//Still render the label.
				renderLabel(imageStack, {
					value: field.label
				})
			});

	} else {

		me.renderButton(stackLayout, field);
	}

	me.addTapActionListener(stackLayout, field);
	return stackLayout;



}


/**
 * add Tap event Handler for element. 
 * action can be a string, or object with key `action`.
 * if action='event'` then must be {"action":"event", "event":"someEventName"}
 */
ViewRenderer.prototype.addTapActionListener = function(button, field) {


	var me = this;
	var action = field;

	if (field.action) {
		action = field.action
	}

	var validActions = ['submit', 'data', 'back', 'link', 'share', 'form', 'view', 'list', 'event'];

	if (typeof action == "function" || validActions.indexOf(action) >= 0) {
		button.on(buttonModule.Button.tapEvent, function() {
			if(field.confirm){

				var args={
			        "title": (typeof field.confirm=="string"?field.confirm:"Are you sure?"),
			        "message": ""
			    };

			    if(_isObject(field.confirm)){
			    	args=extend(args, field.confirm);
			    }

				global.messages.confirm(args).then(function(result){

			    	console.log('Result:'+result);
			    	if(result){
			    		me.executeTapAction(button, field)
			    	}
			    	
			    });

			}else{
				me.executeTapAction(button, field)
			}
			
		});
		return;
	}

	console.log('Unknown button tap action: ' + action);

}

ViewRenderer.prototype.executeTapAction = function(button, field) {


	var me = this;
	var action = field;

	if (field.action) {
		action = field.action
	}

	console.log('Apply button action ' + action);



	if (typeof action == "function") {
		/**
		 * Not possible if form is defined in json...
		 */

		console.log("Button With Function!");

		action(me.getActiveViewData(), button);


		return;

	}


	if (action == 'submit') {


		me.submit(field);


		return
	}
	if (action == 'data' && field.data) {

		Object.keys(field.data).forEach(function(k) {
			me._model.set(k, field.data[k]);
		})


		return
	}

	if (action == 'back') {

		me.back(field.back);

		return
	}

	if (action == 'link') {


		var link = me._parse(field.link);
		console.log(link)
		utilityModule.openUrl(link);


		return;

	}

	if (action == 'share') {


		SocialShare.shareUrl(me._parse(field.link), me._parse(field.linkLabel) || "Some Text", "How do you want to share this " + (field.linkTargetType || "app"));
		return;


	}

	if (action == 'form' || action == 'view' || action == 'list') {

		//me._navigateToForm(field);
		me._showSubform(field);

		return
	}

	if (action == 'event') {

		var eventData = {
			eventName: field.event,
			object: this
		};
		me.notify(eventData);

		return
	}


	throw 'Unknown button tap action: ' + action;


};




ViewRenderer.prototype._showSubform = function(field, callback) {

	if(!(field.form||field.name||field.view)){
		

		throw 'form type: required to have at least `form`, `view`, or `name` field';


	}

	if(!field.name){
		field.name=(field.form||field.view);
	}
	if(!(field.form||field.view)){
		field.form=field.name;
	}

	var me = this;
	var model=me._model;
	
		var chain = callback;
		callback = function(data) {

			data=data[field.name];
			
			model.set(field.name, data);
			if (field.persist === true) {

				if(field.value){
					data=intersectDefault(data, field.value);
				}

				getConfiguration().setLocalData(field.name, data).then(function() {
					console.log('wrote local: ' + field.name+" "+JSON.stringify(data));
					if(chain){
						chain(data);
					}
				}).catch(function(e) {
					console.log('Failed to store local dataset: ' + field.name + ': ' + e);
				});
				return;
			}
				
			if(chain){
				chain(data);
			}
	


		};


	

	//Need Context options for navigation before _pushSubform
	//becuase, _pushSubform clears the model!
	var contextOptions = me._contextOptionsFromField(field);
	if(_isObject(model[field.name])){
		contextOptions.data=extend(contextOptions.data||{}, JSON.parse(JSON.stringify(model[field.name])));
	}
	me._pushSubform(field.name, callback);


	if (field.persist === true) {



		getConfiguration().getLocalData(field.name, {}).then(function(data) {

			contextOptions.data=extend(contextOptions.data||{}, data);
			me._navigateToForm(contextOptions);

		}).catch(function(e) {
			console.log('failed to get local data: ' + e);
			console.error(e);
		})

		return;

	}

	me._navigateToForm(contextOptions);
}

var intersectDefault=function(a, b){
	var obj={};
	Object.keys(b).forEach(function(k){
		if(typeof a[k]!='undefined'){
			obj[k]=a[k];
		}else{
			obj[k]=b[k]
		}
	})
	return obj
}

ViewRenderer.prototype._navigateToForm=function(contextOptions){

	var me=this;

	var topmost = frameModule.topmost();

	

	topmost.navigate({
		moduleName: "views/form/form",
		context: contextOptions
	});

	return;
}

ViewRenderer.prototype._contextOptionsFromField=function(field){

	var me=this;

	var contextOptions = extend({}, field); 



		/**
		 * Note: I'm carefully allowing field to pass through withough making sure it is completely disconnected from 
		 * any object references (using json) so that functions are not lost. (audio picker...)
		 */
		
		if (contextOptions.data ) {
			contextOptions.data = me._parse(contextOptions.data);
		}

		return contextOptions
}


ViewRenderer.prototype.addTapSelectedListener = function(button, field, buttons) {

	var me = this;

	button.on(buttonModule.Button.tapEvent, function() {
		if (buttons) {
			me._clearSelected(buttons);
		}


		if (field.name && field.value) {
			console.log('set:' + field.name + ' -> ' + field.value);
			me._model.set(field.name, field.value);
			me._addClass(button, "selected");
		}
	});

	
}


var renderSpace = function(container, field) {

}

ViewRenderer.prototype.renderStyle = function(style) {


	var me = this;

	var styleUrl=style.stylename||style;
	if(typeof styleUrl!='string'){
		throw 'Expected style as string or style.stylename: '.JSON.stringify(style, null, '   ');
	}

	return getConfiguration().getStyle(styleUrl)
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



/**
 * pushes the named form/view (model) onto a stack along with 
 * a view name. before navigation. 
 */
ViewRenderer.prototype._pushSubform = function(name, callback) {

	var me = this;
	if (!me._models) {
		me._models = [];
		me._viewNames = [];
		me._namedViewStack=[];
		me.subFormsCallbacks = {};
	}
	me._models.push(me._model);



	me._model=null;
	
	me._viewNames.push(me._viewName);
	me._namedViewStack.push(name);
	me._addSubformPopCallback(name, callback);


	var eventData = {
		eventName: 'push',
		object: me
	};
	me.notify(eventData);
};

ViewRenderer.prototype._addSubformPopCallback = function(name, callback) {
    
    var me=this;
   
    if (callback) {
        me.subFormsCallbacks[name] = callback;
    }
}

ViewRenderer.prototype._popSubform = function(name, callback) {
	var me = this;
	if (!me._models) {
		throw 'Should have been set by pushSubform';
		me._models = [];
		me._viewNames = [];
	}
	var current = me._model;
	me._clearUpdateIntervals();
	me._model = me._models.pop();
	me._viewName=me._viewNames.pop();
	me._triggerSubformPopCallback(me._namedViewStack.pop());


	var eventData = {
		eventName: 'pop',
		object: me
	};
	me.notify(eventData);

};

ViewRenderer.prototype._triggerSubformPopCallback = function(name) {

	var me=this;

    console.log('Pop Subform: ' + name);
    if (me.subFormsCallbacks[name]) {
        me.subFormsCallbacks[name](global.getFormData());
        delete me.subFormsCallbacks[name];
    }


}




ViewRenderer.prototype.renderForm = function(container, field) {

	var me = this;
	var model=this._model;

	var button = me.renderButton(container, {
		label: field.label
	});

	if (field.value) {
		model.set(field.name, field.value);
	}


	if (field.persist === true) {


		getConfiguration().getLocalData(field.name, field.value || {}).then(function(data) {

			if(field.value){
				
				model.set(field.name, intersectDefault(data, field.value));
			}else{
				model.set(field.name, data);
			}

		}).catch(function(e) {
			console.log('failed to get local data: ' + e);
		})
	}

	me._addClass(button, "subform");
	button.on(buttonModule.Button.tapEvent, function(args) {
		me._showSubform(field);
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

	if (fields && (fields._domId || fields.ios || fields.android)) {

		container.addChild(fields);
		return [fields];
	}


	if (_isObject(fields)) {
		fields = [fields];
	}

	if (_isArray(fields)) {
		//console.log('Create StackLayout Array "right" '+JSON.stringify(right));
		var elements = [];
		fields.forEach(function(field) {
			elements.push(me.renderField(container, field));
		});
		return elements;

	}

	return [];



}
ViewRenderer.prototype.renderFieldset = function(container, fields) {
	var me = this;

	var stack = _createStack();
	container.addChild(stack);

	if(typeof fields=="string"){
		fields=me._parse(fields);
	}

	me._renderFields(stack, fields);

	return stack;
}

ViewRenderer.prototype.renderLayout = function(container, field) {


	var me = this;

	

	var FlexboxLayout = require("ui/layouts/flexbox-layout").FlexboxLayout;
	var flexbox = new FlexboxLayout();
	container.addChild(flexbox);
	//FlexboxLayout.setFlexShrink();

	var name = field.name || 'flexbox-bar';
	var template = field.template || 'flexbox';

	var left = _createStack();
	var center = _createStack();
	var right = _createStack();

	FlexboxLayout.setFlexGrow(center, 1);
	FlexboxLayout.flexDirection="column";


	left.orientation = "horizontal";
	center.orientation = "horizontal";
	right.orientation = "horizontal";

	left.id = name + "-left";
	center.id = name + "-center";
	right.id = name + "-right";

	flexbox.addChild(left);
	flexbox.addChild(center);
	flexbox.addChild(right);


	me._renderFields(left, field.left);
	me._renderFields(center, field.center);
	me._renderFields(right, field.right);


	me._addClass(flexbox, field);


	return flexbox;

}


ViewRenderer.prototype.renderSpinner = function(container, field) {


	if(field.condition){
		return this._renderConditionalFieldset(container, {
			"type":"fieldset",
			"condition":field.condition,
			"fields":[{
				"type":"spinner"
			}]
		})
	}

	var indicator = new activityIndicatorModule.ActivityIndicator();
	indicator.width = 100;
	indicator.height = 100;

	indicator.busy=true;

	container.addChild(indicator);

	return indicator;
}

ViewRenderer.prototype._renderConditionalFieldset = function(container, field) {
	var me = this;

	var stack = _createStack();
	container.addChild(stack);



	me._addClass(stack, "conditional");



	var elements = null;
	var bindings = null;
	var intervals = null;

	var hide = function() {
		//unbind
		console.log('remove feildset items');
		elements.forEach(function(e) {
			//stack.removeChild(e);
			if (e && e.parent) {
				e.parent.removeChild(e);
			}
		})
		elements = null;
		if (bindings) {
			me._removeEventListeners(bindings);
			bindings = null;
		}
		if (intervals) {
			me._clearUpdateIntervals(intervals);
			intervals = null;
		}

		me._removeClass(stack, "active");
	}

	var _last=null;

	me._bind(field.condition, function(value) {

		if(!!value&&elements&&_last!==JSON.stringify(value)){

			//hide, and show on the boolean value of `value` but also
			//redraw if value changes
			hide();
			_last=JSON.stringify(value);
		}


		if ((!!value) && elements === null) {

			intervals = me._watchIntervalBindings(function() {
				bindings = me._watchEventBindings(function() {
					elements = me._renderFields(stack, field.fields);
				});
			})


			me._addClass(stack, "active");

		}

		if ((!value) && elements && elements.length) {
			hide();
		}

	});



	var gestures = require("ui/gestures");
	if (field.swipe) {


		stack.on(gestures.GestureTypes.swipe, function(args) {
			if (_isObject(field.swipe)) {
				Object.keys(field.swipe).forEach(function(k) {
					me._model.set(k, field.swipe[k]);
				})
			}
			if (field.swipe == "hide") {
				hide();
			}

		});
	}



}

/**
 * This can be used to alter the current view.
 */
ViewRenderer.prototype.extendCurrentData = function(data) {
	var me=this;

	Object.keys(data).forEach(function(k) {
		me._model.set(k, data[k]);
	});

}


ViewRenderer.prototype.getElementById = function(id) {
	var me = this;
	return me._page.getViewById(id);

}

ViewRenderer.prototype.renderField = function(defaultParentNode, field) {


	var me = this;
	var model = me._model;

	if (!field) {
		throw 'Requires a field!'
	}

	var container = defaultParentNode;
	if (field.position) {
		var node = me.getElementById(field.position);
		if (node) {
			container = node;
		}


		if (container !== defaultParentNode) {
			var eventName = "insertAt" + field.position[0].toUpperCase() + field.position.split('-').shift().substring(1);
			//console.log('Insert Event: ' + eventName);

			var eventData = {
				eventName: eventName,
				object: me
			};
			me.notify(eventData);
		}
	}

	if(typeof field=="string"&&field[0]=="{"){
		field=me._parse(field);
	}

	if (!field.type) {
		throw 'Field must have a type! ' + JSON.stringify(field, null, "   ")
	}

	if (field.condition && field.type != 'fieldset') {

		var show=me._parse(field.condition);
		console.log('Render Conditional Field: '+field.condition+' :'+(show?"show: true":"!show: false"));
		if(show===field.condition&&(typeof show=="string"&&show.indexOf('{'))>=0){
			console.log('Conditional Field Failed to resolve: '+show);
		}
		if (!show) {
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
	if (field.type == 'augmentedreality') {
		return me.renderARView(container, field);
	}
	if (field.type == 'inlinevideo') {
		return me.renderInlineVideoPlayer(container, field);
	}

	if (field.type == 'textfield') {
		return me.renderTextField(container, field);
	}
	if (field.type == 'textarea') {
		return me.renderTextFieldArea(container, field);
	}

	if (field.type == 'spinner') {
		return me.renderSpinner(container, field);
	}


	if (field.type == 'optionlist') {
		return renderOptionList(container, field);
	}
	if (field.type == 'boolean') {
		return renderBoolean(container, field, model);
	}

	if (field.type == 'iconselect') {
		return me.renderIconselect(container, field);

	}


	if (field.type == 'space') {
		return renderSpace(container, field);
	}

	if (field.type == 'location') {
		return me.renderLocation(container, field);

	}

	if (field.type == 'orientation') {
		return me.renderOrientation(container, field);

	}

	if (field.type == 'form') {
		return me.renderForm(container, field, model);

	}

	if (field.type == 'button') {
		return me.renderButton(container, field, model);

	}

	if (field.type == 'icon') {
		return me.renderButtonsetButton(container, field, model);

	}

	if (field.type == 'buttonset') {
		return me.renderButtonset(container, field, model);

	}

	if (field.type == 'progressbar') {
		return renderProgressBar(container, field, model);

	}

	if (field.type == 'style') {
		return me.renderStyle(field);

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

		if (field.condition) {
			return me._renderConditionalFieldset(container, field);
		} else {
			return me.renderFieldset(container, field.fields);
		}

	}



	if (field.type == 'map') {
		me.renderMap(container, field);
		return;
	}

	if (field.type == 'data') {
		if(!_isObject(field.data)){
			throw 'Expected field.data to exist and be an object: '+JSON.stringify(field, null, '   ');
		}

		var data=me._parse(field.data);
		Object.keys(field.data).forEach(function(k) {
			console.log('add form data: ' + k + ' ' + data[k]);
			var value=data[k];

			model.set(k, value);
		});
		return;
	}

	throw 'Unknown field type: ' + field.type + ': ' + JSON.stringify(field);

}

ViewRenderer.prototype.hasView = function(formName) {

	var me = this
	var forms = global.parameters.views;

	if (typeof forms == 'string' && forms[0] == "{") {
		forms = me._parse(forms);
	}

	return !!forms[formName];


}





ViewRenderer.prototype.renderView = function(page, fields) {

	var me = this;

	var Observable = require("data/observable").Observable;
 	var model= new Observable();
 	model.on(Observable.propertyChangeEvent, function (PropertyChangeData) {
        console.log(me.getNamedViewStackPath()+'.'+PropertyChangeData.propertyName+' changed: '+ JSON.stringify(PropertyChangeData.value));
    });

 	me._model=model;
	me._page = page;


	model.set('isSubmitting', false);
	model.set('submittingStateLabel', '');


	page.on('navigatedTo', function(arg) {
		console.log('Navigated To ' + JSON.stringify(Object.keys(arg)));
		console.log('Navigated To... Check For Back Click: ' + JSON.stringify(arg.isBackNavigation));

	})
	page.on('navigatedFrom', function(arg) {
		//console.log('Navigated From' + JSON.stringify(Object.keys(arg)));
		//console.log('Navigated From' + JSON.stringify(arg.context));
		console.log('Navigated From... Check For Back Click: ' + JSON.stringify(arg.isBackNavigation));
		//console.log('Navigated From' + JSON.stringify(Object.keys(arg.object)));

		if (arg.isBackNavigation) {
			console.log('Should Pop Subform?');
			if(arg.context&&(arg.context.name||arg.context.form)==me.currentView()){
				console.log('Yessss');
				me._setFormData(me.getActiveViewData());
				me._popSubform();
			}else{
				console.log('Nooooo');
			}
			me._clearUpdateIntervals();
		}
	})


	page.bindingContext = model;


	var context = page.navigationContext;
	console.log('Rendering view with context: ' + JSON.stringify(context, null, "   "));
	var container = page.getViewById("container");

	var formName = "main";
	if (context) {
		if (context.view || context.form) {
			formName = context.view || context.form;
		}
		if (context.name) {
			formName = context.name;
		}
		if (context.events) {
			Object.keys(context.events).forEach(function(e) {
				me.on(e, context.events[e]);
			});
		}

		if (context.data) {
			Object.keys(context.data).forEach(function(k) {
				console.log('add form context data: ' + k + ' ' + JSON.stringify(context.data[k]));
				model.set(k, context.data[k]);
			});
		}
	}

	me._viewName = formName;

	me._addClass(container, "form-" + formName)
	me._addClass(page, formName + "-view");
	me._addClass(page, require("application").android ? "android" : "ios");



	var elements = [];
	if (fields) {
		elements = fields
	} else if (context.fields) {
		elements = context.fields
	} else {

		elements = me._getBestFieldSetDefinition(['views', 'forms', 'lists', 'default-views'], formName);
	}


	if (typeof elements == 'string' && elements[0] == "{") {
		try{
			elements = me._parse(elements);
		}catch(e){
			console.error(e);
			console.error('Failed to parse view elements from: '+elements);
		}
	}

	if (!elements) {
		throw 'Invalid form fields: (' + (typeof elements) + ') for ' + formName;
	}

	me._renderDefaultStyle();
	me._renderFields(container, elements);

	var data = me.getFormData();
	me.setCurrentViewData(data);
	//me.getActiveViewData();


	var eventData = {
		eventName: "renderedView",
		object: this
	};

	me.notify(eventData);

}

ViewRenderer.prototype._getBestFieldSetDefinition = function(name, view) {

	var me = this;
	var names = name;
	if (!_isArray(name)) {
		names = [name];
	}

	name = names.shift();
	console.log('look for view elements in ' + name);
	var views = global.parameters[name] || false;

	if (typeof views == 'string' && views[0] == "{") {
		views = me._parse(views);
	}

	if (views && views[view]) {
		return views[view];
	}

	if (names.length) {
		return me._getBestFieldSetDefinition(names, view);
	}

	return false
}


/**
 * List View Renderer!
 */



ViewRenderer.prototype._getListViewRenderer = function() {
	var me = this;
	if (!me._listViewRenderer) {
		var ListViewRenderer = require('../').ListViewRenderer;
		me._listViewRenderer = new ListViewRenderer();
	}
	return me._listViewRenderer;
}
ViewRenderer.prototype.renderSplit = function(container, field) {
	var me = this;
	return me._getListViewRenderer().renderSplit(container, field);
}

ViewRenderer.prototype.renderList = function(container, field) {
	var me = this;
	return me._getListViewRenderer().renderList(container, field);
}

ViewRenderer.prototype.setListResolver = function(name, fn) {
	var me = this;
	return me._getListViewRenderer().setListResolver(name, fn);
}



ViewRenderer.prototype._createStack = function(items) {

	var me = this;
	//console.log('Create StackLayout');
	var stackLayout = new stackLayoutModule.StackLayout();

	if (items) {
		items.forEach(function(item) {

			if ((item._domId || item.ios || item.android)) {
				stackLayout.addChild(item);
				return;
			}
			if (_isObject(item)) {
				me.renderField(stackLayout, item);
				return;
			}
			throw 'Unknown item _createStack(item): ' + item;

		})
	}

	return stackLayout;
}

var _createStack = function(items) {
	return instance._createStack(items);
}

/**
 * returns data associated with the currently visible view
 * and any data added from any subviews (if popped or containing persistent data)
 * (each view/subview has it's own model)
 */
ViewRenderer.prototype.getActiveViewData = function(model) {
	var me = this;

	var data = {};
	if (!model) {
		model = me._model;
	}
	Object.keys(model).forEach(function(k) {
		if (k.indexOf('_') === 0) {
			return;
		}
		data[k] = model[k];
	});

	return JSON.parse(JSON.stringify(data));
}

ViewRenderer.prototype.setCurrentViewData = function(data) {

	var me = this;
	me.mergeCurrentViewData(data);
}

ViewRenderer.prototype.mergeCurrentViewData = function(data) {

	var me = this;

	console.log('Set Model Data From Form Data: ' + JSON.stringify(data) + " For Current View: " + me.currentView());
	Object.keys(data).forEach(function(k) {
		console.log('set ' + k + '=' + data[k]);
		me._model.set(k, data[k]);
	});
}


/**
 * Each view has a model that collects data but that data is only applied to the 
 * _lazyFilledFormDataMap when:
 * a view with a submit button and it is pressed, 
 * or a subview's submit button is pressed (with back navagation)
 * or if a subview is popped (back navigation).
 */


ViewRenderer.prototype.getLazyFilledFormDataStack = function() {
	return  JSON.parse(JSON.stringify(me._lazyFilledFormDataMap));
}
ViewRenderer.prototype.getNamedViewStackPath = function() {
	var me=this;
	return  JSON.stringify(me._namedViewStack)
}
ViewRenderer.prototype.getFormData = function() {
	var me=this;

	if(!me._namedViewStack){
		me._namedViewStack=[];
	}

	if(!me._lazyFilledFormDataMap){
		me._lazyFilledFormDataMap={};
	}

    var form = me._lazyFilledFormDataMap;

    me._namedViewStack.forEach(function(s) {
        if (!form[s]) {
            form[s] = {};

        }
        form = form[s];
    });
    var data = {};
    Object.keys(form).forEach(function(k) {
        if (k.indexOf('_') === 0) {
            return;
        }
        data[k] = form[k];
    });
    return JSON.parse(JSON.stringify(data)); //remove any references
}

ViewRenderer.prototype._setFormData = function(data) {

	var me=this;
    var form = me._lazyFilledFormDataMap;

    me._namedViewStack.forEach(function(s) {
        if (!form[s]) {
            form[s] = {};

        }
        form = form[s];
    });



    Object.keys(data).forEach(function(k) {
        form[k] = data[k];
    });
    console.log('Set Form Data for: ' + me._getSubformName() + ': ' + JSON.stringify(form));

}
global.getFormData=function(){
	return instance.getFormData()
}







ViewRenderer.prototype._getSubformName = function() {
	var me=this;

    if (me._namedViewStack.length === 0) {
        return 'root';
    }

    var name = me._namedViewStack[me._namedViewStack.length - 1];
    return name;
}






module.exports = ViewRenderer;