

function Template(){


	
}


Template.prototype._format=function(data, formatters){



	formatters.forEach(function(format){
		if(format==="lower"){
			data=data.toLowerCase();
		}
	});

	return data;

}


Template.prototype.render=function(template, data, prefix){

	var me=this;

    if(!prefix){
        prefix='';
    }

    console.log('Replace Vars'+template);

    if(typeof template=="string"){
    	var str=template;

    	var loops=0;

    	while(str.indexOf('{')>=0){

		    Object.keys(data).forEach(function(key){

		        //console.log('  -- check '+'{'+prefix+key+'}')
		        str=str.replace('{'+prefix+key+'}', data[key]);
		        //str=str.replace('{'+prefix+key+'|', '{'+data[key]+'|'); //leave wrap. 

		        var i=-1;
		        var e=-1;
		        var d=0;
		        var f=-1;
		        while((i=str.indexOf('{'+prefix+key+'|'))>0){
		        	e=str.indexOf('}');
		        	var f=str.indexOf('|', i);
		        	str=str.substring(0,i)+me._format(data[key], str.substring(f+1, e).split('|'))+str.substring(e+1);
		        	d++;
		        	if(d>100){
		        		throw 'At Max Inner Depth (100)!!!';
		        	}
		        }

		        if(Object.prototype.toString.call(data[key]) == "[object Object]"){
		            str=me.render(str, data[key], prefix+key+'.');
		        }
		    })

		    loops++;
		    if(prefix!==''){
		    	break;
		    }
		    if(loops>10){
		       	throw 'At Max Main Loop Depth (10)!!! '+str+'  '+JSON.stringify(data, null, '  ');
		    }
		}




    return str;


    }

    if(Object.prototype.toString.call(template) == "[object Object]"){
    	var obj=JSON.parse(JSON.stringify(template));
        Object.keys(obj).forEach(function(k){
        	obj[k]=me.render(obj[k], data, prefix);
        });
        return obj;
    }

    if(Object.prototype.toString.call(template) == "[object Array]"){
       	var arr=JSON.parse(JSON.stringify(template));
        return arr.map(function(v){
        	return me.render(v, data, prefix);
        });

    }

    throw 'Unexpected template!: '+template;
    

};



module.exports = Template;