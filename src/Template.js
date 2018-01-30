function Template() {



}


var BasePath='.';
Template.SetJsonPath=function(path){

	BasePath=path;

}


Template.prototype.hasTemporalFormatter = function(str) {

	return str.indexOf('|dateFromNow}')>0||str.indexOf('|date}')>0

}

Template.prototype._format = function(data, formatters) {








	formatters.forEach(function(format) {

		if(format.indexOf('?')===0){
			var options=format.substring(1).split(':');
			if(options.length>2){
				
				/**
				 * simple (not perfect?) method to ignore quote encapsulated `:` chars like this ?`::`:`:` the first 2 and last 1 are wrapped in `
				 */

				for(var i=1;i<options.length;i++){
					var prev=options[i-1];
					prev=prev.substring(prev.length-1);

					var next=options[i][0];

					if(prev===next&&(['`','"',"'"]).indexOf(prev)>=0){
						
						options=[options.slice(0, i).join(':'), options.slice(i).join(':')];
						break;
					}
				}
			}
			if(options.length==1){
				if(options[0]===""){
					options[0]=true;
				}
				options.push(false);
			}
			data=options[data?0:1];
			if((['`','"',"'"]).indexOf(data[0])>=0){
				data=data.substring(1, data.length-1);
			}else{
				if(data=='true'){
					data = true;
				}
				if(data=='false'){
					data = false;
				}
				if(!isNaN(parseInt(data))){
					data=parseInt(data);
				}
			}
		}


		if(format.indexOf('round(')===0){

			var num=parseInt(format.split('round(')[1].split(')')[0]);
			data=Math.round(parseFloat(data)*Math.pow(10,num))/Math.pow(10,num);

			

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
		if (format === "snake") {
			data = data.toLowerCase().split(' ').join('_');
		}
		if (format === "camel") {
			data = data.toLowerCase().split(' ').map(function(a){
				return a[0].toUpperCase()+a.substring(1);
			}).join('');
		}
		if (format === "json") {
			data = JSON.stringify(data, null, '   ');
			data=data.split(":").join('=>').split("{").join(':').split("}").join('');
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

		try{
			if(format==="dateFromNow"){

				//console.log("Date: "+data);
				
				var moment = require('moment');
				if(data[data.length-1]!=='Z'){
					data=data+"Z";
					
				}	
				data=moment(data).fromNow();
				
			}
			if(format==="date"){
				//console.log("Date: "+data);
				var moment = require('moment');
				if(data[data.length-1]!=='Z'){
					data=data+"Z";
					
				}	
				data=moment(data).format('dddd MMMM Do');
			}
			if(format==="time"){
				//console.log("Date: "+data);
				var moment = require('moment');
				if(data[data.length-1]!=='Z'){
					data=data+"Z";
					
				}	
				data=moment(data).format('LTS');
			}
		}catch(e){}

		if(format==="url"&&data.indexOf('https://')!==0){
			data=global.client.getProtocol()+'://' + global.client.getUrl() + "/" + data;
		}
	});

	return data;

}

var addSystemVariables=function(data){


	data.now=(new Date()).toISOString();

	try{
		if(require("application").ios){
			data.ios=true;
			data.android=false;
		}else{
			data.ios=false;
			data.android=true;
		}
	}catch(e){}

	try{
		data.accountCreationDate=require('../').Configuration.SharedInstance().getLocalDataModifiedDate("account");
	}catch(e){}


	try{

		var appversion = require("nativescript-appversion");
		data.versionName=appversion.getVersionNameSync();
		data.versionCode=appversion.getVersionCodeSync();
		data.appId=appversion.getAppIdSync();

	}catch(e){}

}


/*
 *  it is always safe to modify data object.
 */
Template.prototype._render = function(template, data, prefix) {

	var me = this;

	addSystemVariables(data);
	

	if (!prefix) {
		prefix = '';
	}


	if(!(Object.prototype.toString.call(data) == "[object Object]"||Object.prototype.toString.call(data) == "[object Array]")) {
		throw 'Data should be an object or an array: '+(typeof data)+" "+JSON.stringify(data);
	}

	if (typeof template == "string") {
		var str = template;


		

		var loops = 0;

		while (str.indexOf('{') >= 0) {

			if(!me._replaceLiterals){
				str=me._replaceConstantsLoop(str, data);
			}

			var indexes = [];
			if(Object.prototype.toString.call(data) == "[object Array]"){
				data.forEach(function(v,i){
					indexes.push(i);
				});
				indexes.push('length');
			}else{
				indexes = Object.keys(data);
			}
			
			if(str.indexOf('.json}')>0){
				var fileName=str.substring(1,str.length-1);
				console.log("resolve external variables: "+fileName);
				
				var fs=require('file-system');
				var filePath = fs.path.join(BasePath, fileName);
			
			    if (fs.File.exists(filePath)) {
			       return require(filePath);
			    }
			}



			for (var h = 0; h < indexes.length; h++) {
				var key = indexes[h];


				var value = data[key];

				if (typeof value!=="string") {



					/**
					 * template resolved to a non string 
					 */

					if (str === '{' + prefix + key + '}') {

						if(me._replaceLiterals){
							return str;
						}

						return value;
					}
				}

				if(typeof str!='string'){
					throw 'Expected String!: '+(typeof str)+' '+JSON.stringify(str);
				}
				//console.log('  -- check '+'{'+prefix+key+'}')
			
				if(me._replaceLiterals){
					str = str.replace('{' + prefix + key + '}', '{`'+value+'`}');
				}

				str = str.replace('{' + prefix + key + '}', value);
				//str=str.replace('{'+prefix+key+'|', '{'+data[key]+'|'); //leave wrap. 

				
					str=me._replaceVariableLoop(str, prefix, key, data);
				


				if (Object.prototype.toString.call(value) == "[object Object]"||Object.prototype.toString.call(value) == "[object Array]") {

					if(str.indexOf('{'+prefix+key+'.')>=0){
						str = me._render(str, value, prefix + key + '.');
					}

					
				}

				if(typeof str!='string'){
					return str;
				}


			}


			loops++;
			if (prefix !== '') {
				break;
			}

			if (loops > 10) {
				return str;
				//throw 'At Max Main Loop Depth (100)!!! ' + str + '  ' + JSON.stringify(data, null, '  ');
			}

			//console.log('loop: '+loops+' '+str+' '+JSON.stringify(data));
		}



		return str;


	}

	if (Object.prototype.toString.call(template) == "[object Object]") {
		var obj = JSON.parse(JSON.stringify(template));
		Object.keys(obj).forEach(function(k) {
			obj[k] = me._render(obj[k], data, prefix);
		});
		return obj;
	}

	if (Object.prototype.toString.call(template) == "[object Array]") {
		var arr = JSON.parse(JSON.stringify(template));
		return arr.map(function(v) {
			return me._render(v, data, prefix);
		});

	}

	if(typeof template=="number"){
		return template;
	}
	if(typeof template=="boolean"){
		return template;
	}

	throw 'Unexpected template! '+ (typeof template)+': ' + template;


};

Template.prototype._replaceVariableLoop = function(str, keyPrefix, key, data) {

	var me=this;

	var i = -1;
	var e = -1;
	var d = 0;
	var f = -1;
	
	while ((i = str.indexOf('{' + keyPrefix + key + '|')) >= 0) {
		
			e = str.indexOf('}', i);
			var f = str.indexOf('|', i);
			try{

				var prefix=str.substring(0, i);
				var suffix=str.substring(e + 1);
				var format=str.substring(f + 1, e).split('|');
				var value=data[key];
				if(me._replaceLiterals&&typeof value=='string'){
					str =  prefix + '{'+ (['`'+value+'`']).concat(format).join('|') + '}'+ suffix ;
					continue;
				}
				
				var formatted=me._format(value, format);

				

				if(prefix===""&&suffix===""){
					return formatted
				}

				if (Object.prototype.toString.call(formatted) == "[object Object]"||Object.prototype.toString.call(formatted) == "[object Array]") {
					
					var tempKey='_'+key+'_'+format;
					//console.log('set temp data key: '+tempKey+" at depth: "+d+" "+JSON.stringify(formatted));
					data[tempKey]=formatted;
					formatted=keyPrefix+tempKey;

				}


		
				str =  prefix+ formatted +suffix ;

				
			}catch(err){
				throw err+" "+JSON.stringify([i,e,d,f, typeof str, str.length]); 
			}
			
		
		
		d++;
		if (d > 100) {
			throw 'At Max Inner Depth (100)!!!';
		}
	}

	return str;


}

Template.prototype._replaceConstantsLoop = function(str, data) {

	var me=this;

	(['`', '"', "'"]).forEach(function(q){


		var itemParts=str.split('{'+q);
		var recodedParts=[itemParts.shift()];
		itemParts.forEach(function(s, i){
			var constantParts=s.split(q);
			var constant=constantParts[0];
			//constant=constant.substring(0, constant.length-1)
			var tempKey='_'+i+'_constant';
			//console.log('set temp data key: '+tempKey+' '+constant+' {'+tempKey+constantParts.slice(1).join(q));
			data[tempKey]=constant;
			
			recodedParts.push(tempKey+constantParts.slice(1).join(q));

		});
		//console.log(recodedParts);
		str = recodedParts.join('{');
		//console.log(str);
	})
	


	return str;
}

Template.prototype.renderLiterals=function(){
	var me=this;
	me._replaceLiterals=true;

	var result=me.render.apply(me, arguments);

	me._replaceLiterals=false;

	return result;
}


Template.prototype.render = function(arg, data, temp) {

	//return template.render(arg, JSON.parse(JSON.stringify(me._defaultConfig.parameters)), template)

	var me = this;
	if(!data){
		data={};
	}

	//console.log('Decode ' + arg + (temp ? ' With template' : ' No Template'));


	//console.log(str.substring(1, str.length-1));
	var value = me._render(arg, JSON.parse(JSON.stringify(data)));
	if (value === null) {
		console.log('Invalid decode variable: ' + arg);
		throw 'Invalid decode variable: ' + arg;
	}

	if (temp) {
		//console.log('Use template: ' + JSON.stringify(temp));

		var params = JSON.parse(JSON.stringify(data));

		if (Object.prototype.toString.call(value) == "[object Array]") {

			return value.map(function(v, i) {
				params.value = v;
				params.index = i;
				var result = me._render(temp, params);
				console.log('Replaced Array Items ' + JSON.stringify(temp) + ' => ' + JSON.stringify(result));
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