function Template() {



}



var BasePath='.';
Template.SetJsonPath=function(path){

	BasePath=path;

}


Template.prototype._format = function(data, formatters) {



	formatters.forEach(function(format) {
		if (format === "lower") {
			data = data.toLowerCase();
		}
	});

	return data;

}


Template.prototype._render = function(template, data, prefix) {

	var me = this;

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


			var indexes = [];
			if(Object.prototype.toString.call(data) == "[object Array]"){
				data.forEach(function(v,i){
					indexes.push(i);
				});
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

				if (Object.prototype.toString.call(value) == "[object Object]" || Object.prototype.toString.call(value) == "[object Array]") {

					/**
					 * template resolved to a non string 
					 */

					if (str === '{' + prefix + key + '}') {
						return value;
					}
				}

				if(typeof str!='string'){
					throw 'Expected String!: '+(typeof str)+' '+JSON.stringify(str);
				}
				//console.log('  -- check '+'{'+prefix+key+'}')
				str = str.replace('{' + prefix + key + '}', value);
				//str=str.replace('{'+prefix+key+'|', '{'+data[key]+'|'); //leave wrap. 

				var i = -1;
				var e = -1;
				var d = 0;
				var f = -1;
				while ((i = str.indexOf('{' + prefix + key + '|')) > 0) {
					e = str.indexOf('}');
					var f = str.indexOf('|', i);
					str = str.substring(0, i) + me._format(data[key], str.substring(f + 1, e).split('|')) + str.substring(e + 1);
					d++;
					if (d > 100) {
						throw 'At Max Inner Depth (100)!!!';
					}
				}

				if (Object.prototype.toString.call(value) == "[object Object]"||Object.prototype.toString.call(value) == "[object Array]") {
					str = me._render(str, value, prefix + key + '.');

					if(typeof str!='string'){
						return str;
					}
				}
			}

			loops++;
			if (prefix !== '') {
				break;
			}
			if (loops > 10) {
				throw 'At Max Main Loop Depth (10)!!! ' + str + '  ' + JSON.stringify(data, null, '  ');
			}
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

	throw 'Unexpected template!: ' + template;


};



Template.prototype.render = function(arg, data, temp) {

	//return template.render(arg, JSON.parse(JSON.stringify(me._defaultConfig.parameters)), template)

	var me = this;

	console.log('Decode ' + arg + (temp ? ' With template' : ' No Template'));


	//console.log(str.substring(1, str.length-1));
	var value = me._render(arg, data);
	if (value === null) {
		console.log('Invalid decode variable: ' + arg);
		throw 'Invalid decode variable: ' + arg;
	}

	if (temp) {
		console.log('Use template: ' + JSON.stringify(temp));

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

	console.log(' => ' + JSON.stringify(value));

	return value;


}



module.exports = Template;