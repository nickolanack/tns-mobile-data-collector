
var Template=require('../').Template;
var template=new Template();


var assert=require('assert');

console.log(Object.keys(assert));

assert.equal(
	template.render("{hello} {world}", {hello:"Hello", world:"World"}), 
	"Hello World"
	);

assert.equal(
	template.render("{mobile-app-markers.iconset}=>{{value.name|lower}-color-active}", {hello:"Hello", world:"World"}), 
	"???"
	);



