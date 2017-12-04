
var Template=require('../').Template;
var template=new Template();


var assert=require('assert');

console.log(Object.keys(assert));

assert.equal(
	template.render("{hello} {world}", {hello:"Hello", world:"World"}), 
	"Hello World"
	);

assert.equal(
	template.render("{name|kebab}", {name:"Hello World"}), 
	"hello-world"
	);


assert.equal(
	template.render("{name|kebab}", {name:"Hello World"}), 
	"hello-world"
	);


//var terms=require('fs').readFileSync(__dirname+'/terms.txt').toString();

//template.render(terms, {appName:"Hello World", appOwner:"Company Name", appContactNumber:"1-800-555-555"});





console.log("result: "+JSON.stringify(template.render(require(__dirname+'/list.json'), {}, {
		"date":"{value.creationDate|dateFromNow}",
		"icon":"{value.icon}",
		"stack":[{
				"type":"heading",
				"value": "{value.name}"
			},
			{
				"type":"label",
				"value": "{value.point.0}, {value.point.1}",
				"className":"label"
			},
			{
				"type":"image",
				"image":"{{value.description|images}.0.url}",
				"action":"view",
				"view":"markerDetail",
				"data":"{value}"
			}
			
		]}), null, '  '))


var moment = require('moment');
console.log(template.render("Today, {now|date}"));


//TODO support string.

//console.log(template.render('{"2017-11-21T17:28:40.000"|date}'));



console.log(template.render('{someBool|?"cool":"not cool"}',{someBool:true}));





var _arrayDiff=function(a, b){

	return a.filter(function(item){
		return b.indexOf(item)<0;
	})

}
var  _arrayJoin=function(a, b){

	return a.concat(b.filter(function(item){
		return a.indexOf(item)<0;
	}))

}

var _arrayUnique=function(a){

	var o={};
	a.forEach(function(item){
		if(item&&item!=''){
			o[item]='';
		}
	});
	return Object.keys(o);

}

console.log(_arrayUnique(['a', 'b', 'b']));
console.log(_arrayDiff(["preview-audio","hidden"],["preview-audio"]));
console.log(_arrayJoin(['a', 'b'], ['c']));


console.log(template.render('{`'+Math.PI+'`|round(4)}'));



console.log(template.render('{`<img src=\"components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png\" />`|images}'));



console.log(template.render('{{img|images}.0.url|?}',{"img":'<img src=\"components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png\" />'}));

console.log(template.render('{img|stripTags}',{"img":'Hello World<img src=\"components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png\" /> World'}));


console.log(template.renderLiterals({"description":"<img src=\"components/com_geolive/users_files/user_files_305/Uploads/fSo_[ImAgE]_cJn_9An_[G].png\" />"},{},"{{value.description|images}.length|?}"));

console.log(template.renderLiterals('{image}',{"image":[1,2,3]}));


//console.log(template.render('{{`<img src="components/com_geolive/users_files/user_files_305/Uploads/fSo_[ImAgE]_cJn_9An_[G].png" />`|images}.length|?}'));



















