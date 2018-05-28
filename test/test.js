var Template = require('../').Template;
var template = Template.SharedInstance();


var assert = require('assert');

//console.log(Object.keys(assert));




assert.equal(
	template.render("{hello} {world}", {
		hello: "Hello",
		world: "World"
	}),
	"Hello World"
);

assert.equal(
	template.render("{name|kebab}", {
		name: "Hello World"
	}),
	"hello-world"
);


assert.equal(
	template.render("{name|kebab}", {
		name: "Hello World"
	}),
	"hello-world"
);


//var terms=require('fs').readFileSync(__dirname+'/terms.txt').toString();

//template.render(terms, {appName:"Hello World", appOwner:"Company Name", appContactNumber:"1-800-555-555"});



assert.deepEqual(template.render(require(__dirname + '/list.json'), {}, {
		"date": "{value.creationDate|dateFromNow}",
		"icon": "{value.icon}",
		"stack": [{
				"type": "heading",
				"value": "{value.name}"
			}, {
				"type": "label",
				"value": "{value.point.0}, {value.point.1}",
				"className": "label"
			}, {
				"type": "image",
				"image": "{{value.description|images}.0.url}",
				"action": "view",
				"view": "markerDetail",
				"data": {
					"id": "{value.id}",
					"title": "{value.name|split(-)|slice(0,-1)|join(-)|trim}",
					"description": "{value.description|stripTags|trim}",
					"type": "{value.name|split(-)|pop|trim}",
					"coordinates": ["{value.point.0}", "{value.point.1}", "{value.point.2}"],
					"media": "{value.description|images|=>(url)}",
					"media-audio": "{value.description|audios|=>(url)}",
					"media-video": "{value.description|videos|=>(url)}"
				}
			}

		]
	}),


	[{
		"date": "2017-11-20 15:45:54",
		"icon": "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_BmR_nvp_[G]_XFE.png?thumb=48x48",
		"stack": [{
			"type": "heading",
			"value": "Wildlife"
		}, {
			"type": "label",
			"value": "49.8427977, -119.6672336",
			"className": "label"
		}, {
			"type": "image",
			"image": "components/com_geolive/users_files/user_files_297/Uploads/[ImAgE]_XOg_J2W_[G]_PYM.png",
			"action": "view",
			"view": "markerDetail",
			"data": {
				"id": 51,
				"title": "",
				"description": "",
				"type": "Wildlife",
				"coordinates": [
					49.8427977, -119.6672336,
					0
				],
				"media": [
					"components/com_geolive/users_files/user_files_297/Uploads/[ImAgE]_XOg_J2W_[G]_PYM.png"
				],
				"media-audio": [],
				"media-video": []
			}
		}]
	}]
);


// var moment = require('moment');
// console.log(template.render("Today, {now|date}"));


//TODO support string.

//console.log(template.render('{"2017-11-21T17:28:40.000"|date}'));



assert.equal(template.render('{someBool|?"cool":"not cool"}', {
	someBool: true
}), 'cool');



assert.equal(template.render('{someBool|?"http://true":"http://false"}', {
	someBool: false
}), "http://false");



var _arrayDiff = function(a, b) {

	return a.filter(function(item) {
		return b.indexOf(item) < 0;
	})

}
var _arrayJoin = function(a, b) {

	return a.concat(b.filter(function(item) {
		return a.indexOf(item) < 0;
	}))

}

var _arrayUnique = function(a) {

	var o = {};
	a.forEach(function(item) {
		if (item && item != '') {
			o[item] = '';
		}
	});
	return Object.keys(o);

}

assert.deepEqual(_arrayUnique(['a', 'b', 'b']), ['a', 'b']);
assert.deepEqual(_arrayDiff(["preview-audio", "hidden"], ["preview-audio"]), ["hidden"]);
assert.deepEqual(_arrayJoin(['a', 'b'], ['c']), ['a', 'b', 'c']);


assert.equal(template.render('{`' + Math.PI + '`|round(4)}'), 3.1416);



assert.equal(template.render('{`<img src=\"components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png\" />`|images}')[0].html, '<img src="components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png" />');



assert.equal(template.render('{{img|images}.0.url|?}', {
	"img": '<img src=\"components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png\" />'
}), true);

assert.equal(template.render('{img|stripTags}', {
	"img": 'Hello World<img src=\"components/com_geolive/users_files/user_files_388/Uploads/VaG_[ImAgE]_SfU_[G]_ynI.png\" /> World'
}), 'Hello World  World');


assert.equal(template.prepareTemplate({
	"description": "<img src=\"components/com_geolive/users_files/user_files_305/Uploads/fSo_[ImAgE]_cJn_9An_[G].png\" />"
}, {}, "{{value.description|images}.length|?}"), '{{`<img src="components/com_geolive/users_files/user_files_305/Uploads/fSo_[ImAgE]_cJn_9An_[G].png" />`|images}.length|?}');

assert.equal(template.prepareTemplate('{image}', {
	"image": [1, 2, 3]
}),'{image}');


template.addFormatter('_string',function(value){
	return value+"";
})

assert.equal(template.render('{survey|_string}?tint={survey-color}', {
	"survey-color":"rgb(1,2,3)",
	"survey":["someUrl"],
}), 'someUrl?tint=rgb(1,2,3)');



//assert.equal('`' + template.render("{`Layer Name - Snow and Ice `|split(-)|pop|trim}") + '`', 'Snow and Ice');

assert.equal(template.render('{{`<img src="components/com_geolive/users_files/user_files_305/Uploads/fSo_[ImAgE]_cJn_9An_[G].png" />`|images}.length|?}'), true);

assert.equal(template.render("{`Layer Name - Snow and Ice `|split(-)|pop|trim}"), 'Snow and Ice');


console.log('Success!');