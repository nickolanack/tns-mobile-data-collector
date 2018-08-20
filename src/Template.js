



var _isObject = function(a) {
	return Object.prototype.toString.call(a) == "[object Object]"
}

var _isArray = function(a) {
	return Object.prototype.toString.call(a) == "[object Array]"
}


var _isString = function(a) {

	return typeof a == "string";

}
 
var _isStringLike=function(a){
	return typeof a == "string"||typeof a == "number";
}

var instance=null;
function Template() {

	if(instance){
		throw 'Template Shared Instance already exists. use Template.SharedInstance method'
	}

	var me=this;
	me._basePath = '.';

}


Template.SharedInstance=function(){


	if(!instance){
		instance=new Template();
	}
	

	return instance;

}



Template.prototype.setJsonPath = function(path) {

	var me=this;
	me._basePath = path;

	return me;

}



/**
 * it is useful to know if a template contains a temoral formatter, because
 * the template should rerender periodically (ie: templating the behavoir of a timer)
 */
Template.prototype.hasTemporalFormatter = function(str) {

	return str.indexOf('|dateFromNow}') > 0 || str.indexOf('{now') >= 0;

}


Template.prototype.addFormatter = function(str, fn) {

	var me=this;
	if(!me._userFormatters){
		me._userFormatters={};
	}

	me._userFormatters[str]=fn;

	return me;

}

Template.prototype._format = function(variable, formatters) {

	var me=this;

	var data = variable;



	formatters.forEach(function(format) {



		if (format.indexOf('?') === 0) {
			var options = format.substring(1).split(':');
			if (options.length > 2) {

				/**
				 * simple (not perfect?) method to ignore quote encapsulated `:` chars like this ?`::`:`:` the first 2 and last 1 are wrapped in `
				 */

				for (var i = 1; i < options.length; i++) {
					var prev = options[i - 1];
					prev = prev.substring(prev.length - 1);

					var next = options[i][0];

					if (prev === next && (['`', '"', "'"]).indexOf(prev) >= 0) {

						options = [options.slice(0, i).join(':'), options.slice(i).join(':')];
						break;
					}
				}
			}
			if (options.length == 1) {
				if (options[0] === "") {
					options[0] = true;
				}
				options.push(false);
			}
			data = options[data ? 0 : 1];
			if ((['`', '"', "'"]).indexOf(data[0]) >= 0) {
				data = data.substring(1, data.length - 1);
			} else {
				if (data == 'true') {
					data = true;
				}
				if (data == 'false') {
					data = false;
				}
				if (!isNaN(parseInt(data))) {
					data = parseInt(data);
				}
			}
		}


		if (format.indexOf('round(') === 0) {

			var num = parseInt(format.split('round(')[1].split(')')[0]);
			data = Math.round(parseFloat(data) * Math.pow(10, num)) / Math.pow(10, num);



		}

		//Destructure !!

		if (format.indexOf('=>(') === 0) {

			var arg = format.split('=>(')[1].split(')')[0];

			data = data.map(function(d) {
				return d[arg];
			})


		}

		if (format.indexOf('split(') === 0) {

			var arg = format.split('split(')[1].split(')')[0];

			data = data.split(arg);


		}

		if (format.indexOf('join(') === 0) {

			var arg = format.split('join(')[1].split(')')[0];

			data = data.join(arg);


		}

		if (format.indexOf('slice(') === 0) {

			var args = format.split('slice(')[1].split(')')[0].split(',').map(function(a) {
				return parseInt(a);
			});

			data = Array.prototype.slice.apply(data, args);

		}

		if (format.indexOf('pop') === 0) {
			if(!_isArray(data)){
				throw 'pop expects an array: '+(typeof data)+' '+data;
			}
			data = data.pop();

		}
		if (format.indexOf('shift') === 0) {
			data = data.shift();
		}


		if (format.indexOf('trim') === 0) {

			data = data.trim();

		}

		if (format === "lower") {
			data = data.toLowerCase();
		}
		if (format === "upper") {
			data = data.toUpperCase();
		}
		if (format === "kebab") {
			data = data.toLowerCase().split(' ').join('-');
		}
		if (format === "capitalize") {
			data = data.toLowerCase().split(' ').map(function(s) {
				return s[0].toUpperCase() + s.slice(1);
			}).join(' ');
		}
		if (format === "snake") {
			data = data.toLowerCase().split(' ').join('_');
		}
		if (format === "camel") {
			data = data.toLowerCase().split(' ').map(function(a) {
				return a[0].toUpperCase() + a.substring(1);
			}).join('');
		}
		if (format === "json") {
			data = JSON.stringify(data, null, '   ');
			data = data.split(":").join('=>').split("{").join(':').split("}").join('');
		}

		if (format === "urlencode") {
			data = encodeURIComponent(data);

		}

		if (format === "images") {

			var Parser = require('./HtmlParser.js');
			data = Parser.ParseImages(data);

		}
		if (format === "audios") {

			var Parser = require('./HtmlParser.js');
			data = Parser.ParseAudios(data);

		}
		if (format === "videos") {

			var Parser = require('./HtmlParser.js');
			data = Parser.ParseVideos(data);

		}
		if (format === "stripTags") {

			var Parser = require('./HtmlParser.js');
			data = Parser.StripTags(data);

		}

		try {
			if (format === "dateFromNow") {

				//console.log("Date: "+data);

				var moment = require('moment');
				if (data[data.length - 1] !== 'Z') {
					data = data + "Z";

				}
				data = moment(data).fromNow();

			}
			if (format === "date") {
				//console.log("Date: "+data);
				var moment = require('moment');
				if (data[data.length - 1] !== 'Z') {
					data = data + "Z";

				}
				data = moment(data).format('dddd MMMM Do');
			}
			if (format === "time") {
				//console.log("Date: "+data);
				var moment = require('moment');
				if (data[data.length - 1] !== 'Z') {
					data = data + "Z";

				}
				data = moment(data).format('LTS');
			}

			if (data === 'Invalid date') {
				console.log('Template Invalid Date: ' + variable)
			}


			if (format === "url" && data.indexOf('https://') !== 0) {
				data = global.client.getProtocol() + '://' + global.client.getUrl() + "/" + data;
			}




			if(me._userFormatters){
				Object.keys(me._userFormatters).forEach(function(definition){
					if(me._formatCompareName(definition, format)){

						data=me._userFormatters[definition].apply(me, [data].concat(me._formatArguments(definition, format)));

					}

				});
			}


		} catch (e) {}

		
	});



	

	return data;

}

Template.prototype._formatArguments=function(definition, instance){
	return [];
}

Template.prototype._formatCompareName=function(definition, instance){
	return definition===instance;
}

Template.prototype._addSystemVariables = function(data) {

	var me=this;
	if(!me._globals){

		me._globals={};

		try {
			if (require("application").ios) {
				me._globals.ios = true;
				me._globals.android = false;
			} else {
				me._globals.ios = false;
				me._globals.android = true;
			}
		} catch (e) {}

		try {
			me._globals.accountCreationDate = require('../').Configuration.SharedInstance().getLocalDataModifiedDate("account");
		} catch (e) {}


		try {

			var appversion = require("nativescript-appversion");
			me._globals.versionName = appversion.getVersionNameSync();
			me._globals.versionCode = appversion.getVersionCodeSync();
			me._globals.appId = appversion.getAppIdSync();

		} catch (e) {}
	}

	Object.keys(me._globals).forEach(function(key){
		data[key]=me._globals[key];
	});



	try{
		var orientation = require('nativescript-orientation');
  		//console.log(orientation.getOrientation());
  		data.orientation=orientation.getOrientation();

  	}catch(e){

  	}

	data.now = (new Date()).toISOString();

	

}


/*
 *  it is always safe to modify data object.
 */
Template.prototype._render = function(template, data, prefix) {

	var me = this;




	if (!(_isObject(data) || _isArray(data))) {
		throw 'Data should be an object or an array: ' + (typeof data) + " " + JSON.stringify(data);
	}


	if (_isObject(template)) {
		var obj = JSON.parse(JSON.stringify(template));
		Object.keys(obj).forEach(function(k) {
			obj[k] = me._render(obj[k], data);
		});
		return obj;
	}

	if (_isArray(template)) {
		var arr = JSON.parse(JSON.stringify(template));
		return arr.map(function(v) {
			return me._render(v, data);
		});

	}

	if (typeof template == "number") {
		return template;
	}
	if (typeof template == "boolean") {
		return template;
	}


	if (typeof template == "string") {


		if (me._isInclude(template)) {
			return me._include(template);
		}


		return me._renderIntoString(template, data);

	}



	throw 'Unexpected template! ' + (typeof template) + ': ' + template;


};

Template.prototype._isInclude = function(template) {
	var reg = /{([^}{]+.json)[}]/g;
	var regResults = reg.exec(template);
	if (regResults && template == regResults[0]) {

		return true;
	}


	reg = /{([^}{]+.html)[}]/g;
	regResults = reg.exec(template);
	if (regResults && template == regResults[0]) {

		return true;
	}

	return false;
}
Template.prototype._include = function(template) {

	var me=this;

	var reg = /{([^}{]+.json)[}]/g;
	var regResults = reg.exec(template);

	if (regResults) {
		var fileName = regResults[1];
		console.log("resolve external variables: " + fileName);
		var fs = require('file-system');
		var filePath = fs.path.join(me._basePath, fileName);

		if (fs.File.exists(filePath)) {
			return require(filePath);
		}
	}



	var reg = /{([^}{]+.html)[}]/g;
	var regResults = reg.exec(template);

	if (regResults) {
		var fileName = regResults[1];
		console.log("resolve external variables: " + fileName);
		var fs = require('file-system');
		var filePath = fs.path.join(me._basePath, fileName);

		if (fs.File.exists(filePath)) {
			var file = fs.File.fromPath(filePath);
			return file.readTextSync();
		}
	}


}

Template.prototype._getDataForKey = function(data, key) {
	var me = this;

	//console.log('get data for key: '+key);
	if (me._isStringLiteral(key)) {
		//console.log('String Literal: '+key);
		return key.substring(1, key.length-1);
	}


	var parts = key.split('.');
	var variable = data;


	var k = parts.shift();
	//console.log('datafor: '+k+": "+typeof data[k]);
	if (typeof data[k] !== "undefined") {
		if (parts.length == 0) {
			return data[k];
		}
		return me._getDataForKey(data[k], parts.join('.'));
	}

	console.log('Undefined vale for key: '+key+' in Object.keys(data): '+JSON.stringify(Object.keys(data)));

	return undefined;

}


Template.prototype._isStringLiteral = function(key) {
	return key.length > 0 && key[0] == '`';
}

Template.prototype._shouldApplyFormat = function(value) {
	 var me=this;
	if((me._prepareTemplate&&_isString(value))){
		return false;
	}
	return true;
}

Template.prototype._renderIntoString = function(str, data) {
	var me = this;


	var loops = 0;

	var regexCounter=0;
	var beforeRenderStr=""
	while (str.indexOf('{') >= 0&&regexCounter<5&&str!==beforeRenderStr) {
		regexCounter++;
		beforeRenderStr=str;

		if (!me._prepareTemplate) {
			str = me._replaceConstantsLoop(str, data);
		}
		var reg = /{([^}{]+)[}]/g;
		var regResults;
		var strOnce = str;
		while (regResults = reg.exec(strOnce)) {
			//console.log("Res: "+JSON.stringify(myArray));
			var formatters = regResults[1].split("|");
			var dataKey = formatters.shift();
			var formatStr=formatters.length?'|'+formatters.join('|'):'';
			var dataForKey = me._getDataForKey(data, dataKey);

			//console.log('Reg: '+dataKey+' '+dataForKey);
			if (typeof dataForKey != "undefined") {

		
				var remainingFormatStr=formatStr;

				if (formatters.length) {
					//console.log(dataForKey);
					//console.log(formatters);
					//
					if(me._shouldApplyFormat(dataForKey)){
						dataForKey = me._format(dataForKey, formatters);
						remainingFormatStr='';
					}
					
					
				}


				//Is a single variable replacement using entire string
				if (regResults[0] === str) {


					if (_isString(dataForKey)||typeof dataForKey == "number") {
						if (me._prepareTemplate) {

							
							str = '{`' + dataForKey + '`'+remainingFormatStr+'}';
							
							return str;
						}
					}

					//console.log('return dataForKey');

					return dataForKey;
				}


				//Is a substring, but easily replaceable

				if (_isStringLike(dataForKey)) {


					if (me._prepareTemplate) {
						str = str.replace(regResults[0], '{`'+dataForKey+'`'+remainingFormatStr+'}');
					}else{
						str = str.replace(regResults[0], dataForKey);
					}

					
				}else{

					//console.log('unable to replace: '+dataKey+formatStr+' | not printable');
					
					var tempKey = '_' + dataKey.split('.').join('_') + '_'+(typeof dataForKey)+'_' + formatStr.split('|').join('_');
					//console.log('set temp data key: '+tempKey+" at depth: "+d+" "+JSON.stringify(formatted));
					data[tempKey] = dataForKey;
					str = str.replace(regResults[0], tempKey);

				}

			}

		}
	}

	//console.log('quit rendering ('+regexCounter+'): '+str);
	return str;
}


Template.prototype._replaceConstantsLoop = function(str, data) {

	var me = this;

	(['`', '"', "'"]).forEach(function(q) {


		var itemParts = str.split('{' + q);
		var recodedParts = [itemParts.shift()];
		itemParts.forEach(function(s, i) {
			var constantParts = s.split(q);
			var constant = constantParts[0];
			//constant=constant.substring(0, constant.length-1)
			var tempKey = '_' + i + '_constant';
			//console.log('set temp data key: '+tempKey+' '+constant+' {'+tempKey+constantParts.slice(1).join(q));
			

			//console.log('uncouple string literal: '+constant+' as: data.'+tempKey);

			data[tempKey] = constant;

			recodedParts.push(tempKey + constantParts.slice(1).join(q));

		});
		//console.log(recodedParts);
		str = recodedParts.join('{');
		//console.log(str);
	})



	return str;
}



/**
 * use this methid to return a new template 
 * with insert some initial data embedded in the template
 *
 * this is useful for rendering lists of items, you can 
 * prepare a template with data from each item, and then 
 * render it using a generic view renderer
 *
 *  
 */
Template.prototype.prepareTemplate = function() {

	var me = this;
	me._prepareTemplate = true;

	var startTime = (new Date()).valueOf()
	var result = me._renderTemplate.apply(me, arguments);
	var duration=((new Date()).valueOf() - startTime);
	if(duration>10){
		console.log('!Slow Render Literals: ' + duration + "ms");
	}
	me._prepareTemplate = false;
	return result;

}

Template.prototype.render = function() {

	var me = this;
	var startTime = (new Date()).valueOf()
	var result = me._renderTemplate.apply(me, arguments);
	var duration=((new Date()).valueOf() - startTime);
	if(duration>10){
		console.log('!Slow Render: ' + duration + "ms");
	}
	return result;
}

Template.prototype._renderTemplate = function(arg, data, temp) {

	//return template.render(arg, JSON.parse(JSON.stringify(me._defaultConfig.parameters)), template)

	var me = this;
	if (!data) {
		data = {};
	}
	data = JSON.parse(JSON.stringify(data))
	me._addSystemVariables(data);

	//console.log('Decode ' + arg + (temp ? ' With template' : ' No Template'));


	//console.log(str.substring(1, str.length-1));
	var value = me._render(arg, data);
	if (value === null) {
		console.log('Invalid decode variable: ' + arg);
		throw 'Invalid decode variable: ' + arg;
	}

	if (temp) {
		//console.log('Use template: ' + JSON.stringify(temp));

		var params = JSON.parse(JSON.stringify(data));

		if (_isArray(value)) {

			return value.map(function(v, i) {
				params.value = v;
				params.index = i;
				var result = me._render(temp, params);
				//console.log('Replaced Array Items ' + JSON.stringify(temp) + ' => ' + JSON.stringify(result));
				return result;
			});

		} else {
			params.value = value;
			return me._render(temp, params);
		}


	}

	//console.log(' => ' + JSON.stringify(value));

	return value;


}



module.exports = Template;