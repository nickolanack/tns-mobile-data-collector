"use strict";

var fs;
var frameModule;
var dialogs;


var options;
var template;
var bghttp;

var instance; //Deprecated! 

function DataAcquisitionApplication(client, params) {

    var me = this;
    me._online=false;


 

    fs = require("file-system");
    frameModule = require("ui/frame");
    dialogs = require("ui/dialogs");
    var Template = require('../').Template;
    template = new Template();


    bghttp= require("nativescript-background-http");

   
    me.client = client;
    options = params;
    me.options=params;

    instance=me;

}







try {

    var observableModule = require("data/observable");
    DataAcquisitionApplication.prototype = new observableModule.Observable();

} catch (e) {
    /**
     * TODO: extend Observable or Mock object in a way that supports unit tests
     */
    console.error('Unable to extend Observable!!!');
}


DataAcquisitionApplication.SharedInstance=function(){
    if(!instance){
        throw 'Singleton class requires instantiation';
    }
    return instance;
}


DataAcquisitionApplication.prototype.requireAccessToCamera=function(){

    return new Promise(function(resolve, reject){

        var camera = require("nativescript-camera");
        if(!camera.isAvailable()){
            throw 'No camera available';
        }

        console.log('Request Camera');


        camera.requestPermissions();
        resolve(camera);


    });


}


DataAcquisitionApplication.prototype.requireAccessToGPS=function(){

    var me=this;

    return new Promise(function(resolve, reject){

        console.log('Request GPS');

        
        me.getGeolocation().enableLocationRequest().then(function(){
            console.log('Access To GPS Success');
            resolve(me.getGeolocation());

        }).catch(function(e){
            console.log('Access To GPS Failed '+e);
            //reject(e);
            //
            //
             me.getGeolocation().enableLocationRequest().then(function(){
                console.log('Access To GPS Success');
                resolve(me.getGeolocation());

            }).catch(function(e){
                console.log('Access To GPS Failed '+e);
                reject(e);
            });
        });

    });


}

DataAcquisitionApplication.prototype.getGeolocation=function(){
    var me=this;
    if(!me._geolocation){
        me._geolocation = require("nativescript-geolocation");
    }
    return me._geolocation;
}




DataAcquisitionApplication.prototype.getMessageManager=function(){

    var me=this;
    if(me._messageManager){
        return me._messageManager;
    }

    if(me.options.messageManager){
        me._messageManager=me.options.messageManager;
        return me._messageManager;
    }


    var Messages = require('../').Messages;
    var messages=new Messages(me.options.parameters);

    me._messageManager=messages;
    return me._messageManager

}

DataAcquisitionApplication.prototype._renderTemplate=function(str, data, template){

    var me=this;
    if(!me._template){

        var Template = require('../').Template;
        me._template=new Template();
    }


    return me._template.render(str, data, template);

}



DataAcquisitionApplication.prototype._sumbitFeature = function(data, callback) {

    var me = this;

    console.log(JSON.stringify(data, null, '   '));
    console.log('Submit marker');

    var attributes = {};

    Object.keys(options.attributes).forEach(function(table) {

        var values = {};
        options.attributes[table].forEach(function(key) {

            var value = data[key];

            if (key.indexOf(':') > 0) {

                var parts = key.split(':');

                key = parts[0];


                value = parts[1];
                console.log('Check replacements for ' + key + ' => ' + value);
                value = me._renderTemplate(value, data);
            }


            values[key] = value;

        });
        attributes[table] = values;

    });
     
     var marker={
            name: me._renderTemplate(options.marker.name || "Add Name!", data),
            description: me._renderTemplate(options.marker.description, data),
            coordinates: data.coordinates||data.location,
            style: "DEFAULT"
        };

    console.log("Marker: "+JSON.stringify(marker, null, '   ')+" => layer:"+options.layer);

    global.client.createMarker(
        options.layer, marker, attributes
    ).then(function(result) {

        console.log('Created Marker');
        callback();

    }).catch(function(err) {

        console.log(err);
        callback(err);

    });



};



global.addProgressIndicator = function(start, progress, complete) {
    instance.addProgressIndicator(start, progress, complete);
};
global.setOnline = function() {
     instance._setOnline();
}
global.setOffline = function() { 
    instance._setOffline();
}


//TODO: replace with eventListener 

DataAcquisitionApplication.prototype._taskIndicatorStart = function() {

};
DataAcquisitionApplication.prototype._taskIndicatorProgress = function() {

};
DataAcquisitionApplication.prototype._taskIndicatorComplete = function() {

};



DataAcquisitionApplication.prototype.addProgressIndicator = function(start, progress, complete) {
    
    var me=this;
    
    me._taskIndicatorStart = start;
    me._taskIndicatorProgress = progress;
    me._taskIndicatorComplete = complete;


}



DataAcquisitionApplication.prototype.isOnline = function() {
    var me=this;
    return me._online;
}

DataAcquisitionApplication.prototype._setOnline = function() {
    var me=this;
    me._online = true;
    me._processOfflineForms();
}

DataAcquisitionApplication.prototype._setOffline = function() { 
    me._online = false;
}


DataAcquisitionApplication.prototype._processOfflineForms = function() {


    var me=this;


    var savepath = fs.knownFolders.documents().path;
    var folder = fs.Folder.fromPath(savepath);
    var list = [];
    folder.eachEntity(function(f) {
        //console.log(typeof f.toString());
        var path = f.path.toString();
        if (path.indexOf('data.json') > 0) {
            console.log('process: ' + path);
            list.push(path);
        }
    });

    console.log('Process Offline Forms: ' + list.length);

    if (list.length) {


        var mult = list.length > 1;
        me.getMessageManager().alert({
            title: "Sending Offline Forms",
            "message": "There " + (mult ? "are " : "is ") + list.length + " offline form" + (mult ? "s" : "") + " to submit"
        }).then(function() {
            console.log("Dialog closed!");
            var sendNext = function() {
                if (list.length) {
                    processFormFilePath(list.shift(), null, sendNext);
                }
            }
            sendNext();
        });
    }

};


DataAcquisitionApplication.prototype._processFormFile = function(filename, countItems, callback) {

    var me=this;

    var savepath = fs.knownFolders.documents().path;
    var filepath = fs.path.join(savepath, filename);
    return me._processFormFilePath(filepath, countItems, callback);


}


DataAcquisitionApplication.prototype._processFormFilePath = function(filepath, countItems, callback) {

     var me=this;


    console.log('Process Form File: ' + filepath);

    var file = fs.File.fromPath(filepath);


    var mediaFields=['media', 'media-audio', 'media-video', 'media-image']

    file.readText().then(function(content) {


        var data = JSON.parse(content);

        console.log('Read: ' + content)

        var media=[];
        mediaFields.forEach(function(field){
            if(data[field]){
                media=media.concat(data[field]);
            }
        })

       
        var mediaItems = mediaItemsThatNeedUploading(media);
        if (mediaItems.length) {
            if (!countItems) {
                countItems = mediaItems.length;
            }
            console.log("There are " + mediaItems.length + " items to upload: list:" + JSON.stringify(mediaItems, null, "  "));

            uploadMediaItem(mediaItems[0], countItems - mediaItems.length, countItems).then(function() {
                //recursive call will upload all mediaItems until done...
                console.log(mediaItemsThatNeedUploading(media).length + " items to upload");
                me._processFormFilePath(filepath, countItems, callback);



            }).catch(function(err) {
                console.error('Image Upload Error => ' + err.message);
                callback(err);
            })
            return;
        }



        console.log('About to save marker');
        console.log(JSON.stringify(data));
        data.description = (data.description ? data.description : "") + media.map(function(item) {
            return mediaData(item).html;
        }).join("");
        instance._sumbitFeature(data, function(err) {

            if (!err) {
                file.remove()
            }

            callback(err);

        });



    }).catch(function(err) {
        console.log('Form Error => ' + err);
        callback(err);
    });

}


var mediaItemsThatNeedUploading = function(fileArray) {
    return fileArray.filter(function(mediaFile) {
        return !hasUrlForMedia(mediaFile);
    });
}
var mediaData = function(filename) {
    var fileMetaName = filename + '.json';
    fileMetaName=fileMetaName.split('/').pop()
    var file = fs.File.fromPath(fs.path.join(fs.knownFolders.documents().path, fileMetaName));

    // Writing text to the file.
    var data = file.readTextSync(function(err) {
        console.log('File Read Error => ' + err.message);
    });

    console.log('Read media file:' + data);
    var json;
    try {
        json = JSON.parse(data);
    } catch (e) {
        console.log(data);
        throw e;
    }

    return json;
}



var uploadMediaItem = function(filename, finished, total) {

   return instance.uploadMediaItem(filename, finished, total)
};


DataAcquisitionApplication.prototype.uploadMediaItem=function(filename, finished, total){

    var me=this;

    var savepath = fs.knownFolders.documents().path;
    var filePath = filename[0]=='/'?filename:fs.path.join(savepath, filename);

    filename=filename.split('/').pop();


    var file = fs.File.fromPath(filePath);

    if (!fs.File.exists(filePath)) {
        throw "File does not exist!!";
    }


    var type="image_upload";

    if(filename.indexOf(".mp3")>0||filename.indexOf(".m4a")>0){
        type="audio_upload";
    }

    if(filename.indexOf(".mp4")>0){
        type="video_upload";
    }


    var url = 'https://' + global.client.getUrl()+ "/" + global.client.getPathForTask(type) + "&json=%7B%7D"; 
    var method = "POST";

    console.log('Initiating Background Upload: ' + filename);
    console.log('Post Background ' + method + ': ' + url);
    console.log('File Exists! ' + filename + " " + file.extension + " " + file.lastModified);

    if( type=="video_upload"){
       file.readText().then(function(text){
        console.log("Video: "+text);
       })
    }
    
    var session = bghttp.session("media-upload");

    var request = {
        url: url,
        method: method,
        headers: {
            "Content-Type": "application/octet-stream",
            "File-Name": filename
        },
        description: "{ 'uploading': "+filename+" }"
    };


    console.log('Generating Promise');

    console.log("about to upload: "+filePath);
    var task = session.uploadFile(filePath, request);

    return new Promise(function(resolve, reject) {


        console.log('Executing Promise');


        me._taskIndicatorStart(finished, total);

        task.on("progress", function(value) {
            console.log("progress: " + JSON.stringify(value));
            console.log("progress: " + (100 * parseInt(value.currentBytes) * (finished + 1)) / (parseInt(value.totalBytes) * total));
            me._taskIndicatorProgress('Uploading ' + (finished + 1) + " of " + total, (100 * parseInt(value.currentBytes) * (finished + 1)) / (parseInt(value.totalBytes) * total));
        });
        task.on("error", function(err) {
            console.log("Error");
            console.log(err.eventName);
        });
        task.on("complete", function(response) {
            console.log(JSON.stringify(response));
            me._taskIndicatorComplete(finished + 1, total);
        });

        task.on("responded", function(response) {

            console.log('Response: ' + response.data+" "+url);
            var fileMeta = JSON.parse(response.data);



            var fileMetaName = filename + '.json';
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

    })

}

var hasUrlForMedia = function(filename) {


    filename=filename.split('/').pop();

    var documents = fs.knownFolders.documents();
    var filePath = fs.path.join(documents.path, filename) + '.json';
    return fs.File.exists(filePath);

}


global.storeImageSource = function(imageAsset) {

    return new Promise(function(resolve, reject) {

        var savepath = fs.knownFolders.documents().path;
        var filename = new Date().getTime() + '.png';
        var filepath = fs.path.join(savepath, filename);

        //console.log(imageAsset);
        //var image = 
        require("image-source").fromAsset(imageAsset).then(function(asset) {

            asset.saveToFile(filepath, "png");
            console.log('stored: ' + filename);
            asset = null;
            imageAsset = null;
            return resolve(filename);

        }).catch(function(err) {
            console.log('Error => ' + err.message);
        });

        //console.log(image);


    });


};
var formData = {};
var subFormsNames = [];
var subFormsCallbacks = {};
global.getSubformName = function() {

    if (subFormsNames.length === 0) {
        return 'root';
    }

    var name = subFormsNames[subFormsNames.length - 1];
    return name;
}
global.popSubform = function() {



    var name = subFormsNames[subFormsNames.length - 1];
    console.log('Pop Subform: ' + name);
    if (subFormsCallbacks[name]) {
        subFormsCallbacks[name](getFormData());
        delete subFormsCallbacks[name];
    }

    subFormsNames.pop();

}
global.pushSubform = function(name, callback) {
    console.log('Push Subform: ' + name)
    subFormsNames.push(name);

    if (callback) {
        subFormsCallbacks[name] = callback;
    }
}


global.setFormData = function(data) {
    var form = formData;

    subFormsNames.forEach(function(s) {
        if (!form[s]) {
            form[s] = {};

        }
        form = form[s];
    });



    Object.keys(data).forEach(function(k) {
        form[k] = data[k];
    });
    console.log('Set Form Data for: ' + global.getSubformName() + ': ' + JSON.stringify(form));

}
global.getFormData = function() {
    return instance.getFormData();
}
DataAcquisitionApplication.prototype.getFormData = function() {
    var form = formData;

    subFormsNames.forEach(function(s) {
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

global.submitForm = function(callback) {
    return instance.submitForm(callback);
}
DataAcquisitionApplication.prototype.submitForm = function(callback) {

    var me=this;

    var data = global.getFormData();
    formData = {};
    var callbackData={
        isSubmitting:false,
        submittingStateLabel:""
    }
    global.storeFormJson(data).then(function(file) {
        if (me.isOnline()) {
            me._processFormFile(file, null, function(err) {
                if (err) {
                    

                    var eventData = {
                        eventName: "submitFormFailed",
                        object: me
                    };
                    callback(callbackData);
                    me.notify(eventData);

                    return;
                }

                var eventData = {
                    eventName: "submitFormSuccess",
                    object: me
                };
                callback(callbackData);
                me.notify(eventData);

            });
            return;
        }

        var eventData = {
            eventName: "queuedForm",
            object: me
        };
        callback(callbackData);
        me.notify(eventData);

    })

    var topmost = frameModule.topmost();
    topmost.navigate({
        moduleName: "views/form/form",
        clearHistory: true,
        //backstackVisible:false,
        context: {
            form: require('../').Configuration.SharedInstance().get("mainView","menu"),
            data:{
                isSubmitting:true,
                submittingStateLabel:"Uploading"
            }
        }
    });

}

var generateMarkerFileName = function() {
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