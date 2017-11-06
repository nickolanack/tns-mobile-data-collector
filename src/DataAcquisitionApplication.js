"use strict";

var fs;
var imageSource;
var frameModule;
var dialogs;


var options;
var template;

function DataAcquisitionApplication(client, params){


    fs = require("file-system");
    imageSource = require("image-source");
    frameModule = require("ui/frame");
    dialogs = require("ui/dialogs");
    template=require('../').Template;

	var me=this;
	me.client=client;
    options=params;


}
var replaceVars=function(str, data, prefix){
    return template.render(str, data, prefix);
};


var createMarker = function(data, callback) {

	var me=this;

    console.log(JSON.stringify(data, null, '   '));
    console.log('Submit marker');

    var attributes={};

    Object.keys(options.attributes).forEach(function(table){

        var values={};
        options.attributes[table].forEach(function(key){

             var value=data[key];

            if(key.indexOf(':')>0){

                var parts=key.split(':');
                
                key=parts[0];


                value=parts[1];
                console.log('Check replacements for '+key+' => '+value);
                value=replaceVars(value, data);
            }

           
            values[key]=value;

        });
        attributes[table]=values;

    });
    console.log(JSON.stringify(attributes, null, '   '));

    global.client.createMarker(
        options.layer, {
            name: data.type + " Report",
            description: data.description,
            coordinates: data.coordinates,
            style: "DEFAULT"
        }, attributes
    ).then(function(result) {
        console.log('Created Marker');
        callback();
    }).catch(function(err) {
        console.log(err);
        callback(err);
    });



};

var indicatorStart = function() {};
var indicatorProgress = function() {};
var indicatorComplete = function() {};

global.addProgressIndicator = function(start, progress, complete) {
    indicatorStart = start;
    indicatorProgress = progress;
    indicatorComplete = complete;

    // var v=0;
    // setInterval(function(){
    //     v=(v%100)+1
    //     callback('uploading', v);

    // }, 500);
};

var online=false;
global.setOnline=function(){
    online=true;
    //global.configuration.refreshCacheItems();
    global.processOfflineForms();
}

global.setOffline=function(){
    online=false;
}


global.processOfflineForms=function(){

    
    var savepath = fs.knownFolders.documents().path;
    var folder= fs.Folder.fromPath(savepath);
    var list=[];
    folder.eachEntity(function(f){
        //console.log(typeof f.toString());
        var path=f.path.toString();
        if(path.indexOf('data.json')>0){
            console.log('process: '+path);
            list.push(path);
        }
    });

    console.log('Process Offline Forms: '+list.length);

    if(list.length){


        var mult=list.length>1;
         global.messages.alert({title:"Sending Offline Forms", "message":"There "+(mult?"are ":"is ")+list.length+" offline form"+(mult?"s":"")+" to submit"}).then(function() {
            console.log("Dialog closed!");
            var sendNext=function(){
                if(list.length){
                    processFormFilePath(list.shift(), null, sendNext);
                }
            }
            sendNext();
        });
    }

};


var processFormFile = function(filename, countItems, callback) {

    

    var savepath = fs.knownFolders.documents().path;
    var filepath = fs.path.join(savepath, filename);
    return processFormFilePath(filepath, countItems, callback);


}


var processFormFilePath = function(filepath, countItems, callback) {

    
    console.log('Process Form File: ' + filepath);
    
    var file = fs.File.fromPath(filepath);


    file.readText().then(function(content) {


        var data = JSON.parse(content);

        console.log('Read: ' + content)
        if (!data.media) {
            data.media=[];
        }
            var mediaItems = mediaItemsThatNeedUploading(data.media);
            if (mediaItems.length) {
                if(!countItems){
                    countItems=mediaItems.length;
                }
                console.log(mediaItems.length + " items to upload");
                uploadMediaItem(mediaItems[0], countItems-mediaItems.length, countItems).then(function() {
                    //recursive call will upload all mediaItems until done...
                    console.log(mediaItemsThatNeedUploading(data.media).length + " items to upload");
                    processFormFilePath(filepath, countItems, callback);



                }).catch(function(err) {
                    console.error('Image Upload Error => ' + err.message);
                    callback(err);
                })
                return;
            }
        



        console.log('About to save marker');
        console.log(JSON.stringify(data));
        data.description = (data.description?data.description:"")+data.media.map(function(media) {
            return mediaData(media).html;
        }).join("");
        createMarker(data, function(err){

            if(!err){
                file.remove()
            }

            callback(err);

        });



    }).catch(function(err) {
        console.log('Form Error => ' + err.message);
        callback(err);
    });

}


var mediaItemsThatNeedUploading = function(fileArray) {
    return fileArray.filter(function(mediaFile) {
        return !hasUrlForMedia(mediaFile);
    });
}
var mediaData = function(filename) {
    var fileMetaName = filename + '.json'
    var file = fs.File.fromPath(fs.path.join(fs.knownFolders.documents().path, fileMetaName));

    // Writing text to the file.
    var data = file.readTextSync(function(err) {
        console.log('File Read Error => ' + err.message);
    });

    console.log('Read media file:' + data);
     var json;
    try{
       json=JSON.parse(data);
    }catch(e){
        console.log(data);
        throw e;
    }
    
    return json;
}
var uploadMediaItem = function(filename, finished, total) {


    var savepath = fs.knownFolders.documents().path;
    var filepath = fs.path.join(savepath, filename);
    console.log('Upload: ' + filepath);
    var bghttp = require("nativescript-background-http");

    var session = bghttp.session("image-upload");

    var request = {
        url: 'https://' + global.client.getUrl() + "/" + global.client.getPathForTask("image_upload") + "&json={}",
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "File-Name": filename
        },
        description: "{ 'uploading': '" + filename + "' }"
    };

    var task = session.uploadFile(filepath, request);

    return new Promise(function(resolve, reject) {


        indicatorStart(finished, total);

        task.on("progress", function(value) {
            console.log("progress: " + JSON.stringify(value));
            console.log("progress: " + (100 * parseInt(value.currentBytes)*(finished+1)) / (parseInt(value.totalBytes)*total));
            indicatorProgress('Uploading '+(finished+1)+" of "+total, (100 * parseInt(value.currentBytes)*(finished+1)) / (parseInt(value.totalBytes)*total));
        });
        task.on("error", function(err) {
            console.log(err.eventName);
        });
        task.on("complete", function(response) {
            console.log(JSON.stringify(response));
            indicatorComplete(finished+1, total);
        });

        task.on("responded", function(response) {

            console.log('Response: ' + response.data);
            var fileMeta = JSON.parse(response.data);



            var fileMetaName = filename + '.json'
            var file = fs.File.fromPath(fs.path.join(fs.knownFolders.documents().path, fileMetaName));

            // Writing text to the file.
            file.writeText(JSON.stringify(fileMeta))
                .then(function() {
                    console.log('stored: ' + fileMetaName + " => " + response.data);
                    resolve(fileMeta);
                }).catch(function(err) {
                    console.log('Error => ' + err.message);
                });

        });

        function logEvent(e) {
            console.log(JSON.stringify(e));
        }

    })

}

var hasUrlForMedia = function(filename) {


    var documents = fs.knownFolders.documents();
    var filePath = fs.path.join(documents.path, filename) + '.json';
    console.log('check exists: ' + filePath)
    var exists = fs.File.exists(filePath);
    console.log(exists ? "exists" : "not exists");
    return exists;

}


global.storeImageSource = function(imageAsset) {

    return new Promise(function(resolve, reject) {

        var savepath = fs.knownFolders.documents().path;
        var filename = new Date().getTime() + '.png';
        var filepath = fs.path.join(savepath, filename);

        //console.log(imageAsset);
        //var image = 
        imageSource.fromAsset(imageAsset).then(function(asset) {

            asset.saveToFile(filepath, "png");
            console.log('stored: ' + filename);
            asset=null;
            imageAsset=null;
            return resolve(filename);

        }).catch(function(err) {
            console.log('Error => ' + err.message);
        });

        //console.log(image);


    });


};
var formData={};
var subFormsNames=[];
var subFormsCallbacks={};
global.getSubformName=function(){

    if(subFormsNames.length===0){
        return 'root';
    }

    var name=subFormsNames[subFormsNames.length-1];
    return name;
}
global.popSubform=function(){



    var name=subFormsNames[subFormsNames.length-1];
    console.log('Pop Subform: '+name);
    if(subFormsCallbacks[name]){
        subFormsCallbacks[name](getFormData());
        delete subFormsCallbacks[name];
    }

    subFormsNames.pop();
    
}
global.pushSubform=function(name, callback){
    console.log('Push Subform: '+name)
    subFormsNames.push(name);

    if(callback){
       subFormsCallbacks[name]=callback; 
    }
}


global.setFormData=function(data){
    var form=formData;

    subFormsNames.forEach(function(s){
        if(!form[s]){
            form[s]={};

        }
        form=form[s];
    });


    

    Object.keys(data).forEach(function(k){
        form[k]=data[k];
    });
    console.log('Set Form Data for: '+global.getSubformName()+': '+JSON.stringify(form));
    
}
global.getFormData=function(){
    var form=formData;

    subFormsNames.forEach(function(s){
        if(!form[s]){
            form[s]={};

        }
        form=form[s];
    });
    var data={};
    Object.keys(form).forEach(function(k){
        if(k.indexOf('_')===0){
            return;
        }
        data[k]=form[k];
    });
    return JSON.parse(JSON.stringify(data)); //remove any references
}


global.submitForm = function() {

    var data=global.getFormData();
    formData={};
    global.storeFormJson(data).then(function(file) {
        if(online){
            processFormFile(file, null, function(err){
                if(err){
                    global.messages.alert({title:"Failed to submit form", "message":"Don't worry we'll keep trying"}).then(function() {
                        console.log("Dialog closed!");
                    });
                    return;
                }
                global.messages.alert({title:"Form Submited ", "message":"Successfully sent form to server"}).then(function() {
                    console.log("Dialog closed!");
                });
            });
            return;
        }

        global.messages.alert({title:"Form Queued ", "message":"This form will be submitted the next time you connect to the internet"}).then(function() {
            console.log("Dialog closed!");
        });

    })

    var topmost = frameModule.topmost();
    topmost.navigate({
        moduleName: "views/form/form",
        clearHistory: true,
        //backstackVisible:false,
        context: {
            form: "menu"
        }
    });

}

var generateMarkerFileName=function(){
   return global.parameters.domain + '.' + new Date().getTime() + '.data.json';
}

global.storeFormJson = function(data) {

    return new Promise(function(resolve, reject) {

        var savepath = fs.knownFolders.documents().path;
        var filename = generateMarkerFileName();
        var filepath = fs.path.join(savepath, filename);

        var file = fs.File.fromPath(filepath);

        // Writing text to the file.
        file.writeText(JSON.stringify(data))
            .then(function() {
                console.log('stored: ' + filename + " => " + JSON.stringify(data));
                resolve(filename);
            }).catch(function(err) {
                console.log('Error => ' + err.message);
            });

    });


};



module.exports = DataAcquisitionApplication;

