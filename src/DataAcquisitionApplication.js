"use strict";

var fs;
var frameModule;
var dialogs;


var options;
var bghttp;

var instance; //Deprecated! 


var _isArray = function(thing) {
    return Object.prototype.toString.call(thing) === "[object Array]";
}
var _isObject = function(thing) {
    return Object.prototype.toString.call(thing) === "[object Object]";
}


function DataAcquisitionApplication(params) {

    var me = this;
    me._online = false;



    fs = require("file-system");
    frameModule = require("ui/frame");
    dialogs = require("ui/dialogs");


    bghttp = require("nativescript-background-http");


    options = params;
    me.options = params;
    if (!me.options.parameters) {
        throw 'Requires parameters';
    }

    instance = me;

    me._client().on('wentOnline', function() {
        console.log('got went online');
        me._setOnline();

    });

    me._client().on('wentOffline', function() {
        console.log('got went offline');
        me._setOffline();
    });

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


DataAcquisitionApplication.SharedInstance = function() {
    if (!instance) {
        throw 'Singleton class requires instantiation';
    }
    return instance;
}

DataAcquisitionApplication.prototype._config = function() {
    return require('../').Configuration.SharedInstance();
}
DataAcquisitionApplication.prototype._renderer = function() {
    return require('../').ViewRenderer.SharedInstance();
}
DataAcquisitionApplication.prototype._client = function() {
    return require('../').CoreClient.SharedInstance();
}

DataAcquisitionApplication.prototype.handleServerMessage = function(message, popover) {

    var me = this;

    if (message.data) {
        console.log('Extend data: ' + JSON.stringify(message.data));
        me._renderer().extendCurrentData(message.data);
    }

    if (message.parameters) {
        console.log('Extend parameters: ' + JSON.stringify(message.parameters));
        me._config().extendDefaultParameters(message.parameters);
    }

    if (message.logout) {
        console.log('Forced relogin');
        me._client().relogin();
    }


    if (message.text || message.title) {



        if (popover) {
            if (message.type && message.type !== "success") {
                if (message.type == "error") {
                    return popover.showError(message.title || " ", message.text || " ", message.button || "Close");
                }

                return popover.showWarning(message.title || " ", message.text || " ", message.button || "Close");

            }

            return popover.showSuccess(message.title || " ", message.text || " ", message.button || "Close");


        }

        return me.getMessageManager().alert({
            "title": message.title || " ",
            "message": message.text || " "
        });


    }



}
DataAcquisitionApplication.prototype.requirePermissionFor = function(item) {
    var me = this

    if (_isArray(item)) {

        if (item.length == 1) {
            item = item[0];
        } else {

            return me.requirePermissionFor(item[0]).then(function() {
                return me.requirePermissionFor(item.slice(1));
            });

        }

    }


    if(item.indexOf(':optional')>0){
        var resource=item.split(':').shift();
        return new Promise(function(resolve, reject){
            me.requirePermissionFor(resource).then(function(result) {
               resolve(result);
            }).catch(function(err){

                console.log('Failed to get optional item permission: '+resource);
                console.error(err+JSON.stringify(err));
                
                resolve(null);
            });
        });
    }



    if (item == "camera") {
        return me.requireAccessToCamera();
    }

    if (item == "gps") {
        return me.requireAccessToGPS();
    }

    if (item == "microphone") {
        return me.requireAccessToMicrophone();
    }

    throw 'Unknown device permission: microphone.' + item;

}


DataAcquisitionApplication.prototype.requireAccessToMicrophone = function() {

    var me = this;

    return new Promise(function(resolve, reject) {


        var application = require("application");

        if (application.android) {
            var permissions = require('nativescript-permissions');
            permissions.requestPermission(android.Manifest.permission.RECORD_AUDIO, "Let me hear your thoughts...")
                .then(function() {
                    resolve(me._getMicrophone());
                }).catch(reject);
            return;
        }



        resolve(me._getMicrophone());


    });



}

DataAcquisitionApplication.prototype._getMicrophone = function() {


    var me = this;

    return new Promise(function(resolve, reject) {


        if (!me._recorder) {

            var TNSRecorder = require("nativescript-audio").TNSRecorder;

            if (!TNSRecorder.CAN_RECORD()) {
                throw 'No microphone available';
            }

            me._recorder = new TNSRecorder();
           
        }



         resolve(me._recorder);

        


    });

}

DataAcquisitionApplication.prototype.requireAccessToCamera = function() {

    return new Promise(function(resolve, reject) {

        var camera = require("nativescript-camera");
        if (!camera.isAvailable()) {
            throw 'No camera available';
            /**
             * this is most likely a simulator..
             * should pass a mock camera object here.
             */
            //resolve(null);
            return;
        }

        console.log('Request Camera');


        camera.requestPermissions().then(function() {
            resolve(camera);
        }).catch(function(err) {

            console.error(err);
            console.error("failed to get camera permission");
            reject(err);
        });



    });


}


DataAcquisitionApplication.prototype.requireAccessToGPS = function() {

    var me = this;

    return new Promise(function(resolve, reject) {

        console.log('Request GPS');


        me.getGeolocation().enableLocationRequest().then(function() {
            console.log('Access To GPS Success');
            resolve(me.getGeolocation());

        }).catch(function(e) {
            console.log('Access To GPS Failed ' + e);
            //reject(e);
            //
            //
            me.getGeolocation().enableLocationRequest().then(function() {
                console.log('Access To GPS Success');
                resolve(me.getGeolocation());

            }).catch(function(e) {
                console.error('Access To GPS Failed ' + e);
                reject(e);
            });
        });

    });


}

DataAcquisitionApplication.prototype.getGeolocation = function() {
    var me = this;
    if (!me._geolocation) {
        me._geolocation = require("nativescript-geolocation");
    }
    return me._geolocation;
}



DataAcquisitionApplication.prototype.getMessageManager = function() {

    var me = this;
    if (me._messageManager) {
        return me._messageManager;
    }

    if (me.options.messageManager) {
        me._messageManager = me.options.messageManager;
        return me._messageManager;
    }


    var Messages = require('../').Messages;
    var messages = new Messages(me.options.parameters);



    me._messageManager = messages;
    return me._messageManager

}

DataAcquisitionApplication.prototype._renderTemplate = function(template, data) {

    var me = this;
    if (!me._template) {

        var Template = require('../').Template;
        me._template = Template.SharedInstance();
    }


    return me._template.render(template, me._params(data));

}

DataAcquisitionApplication.prototype._params = function(data) {

    var me = this;

    var params = JSON.parse(JSON.stringify(me._config().getDefaultParameters()));
    params.data = JSON.parse(JSON.stringify(data));
    return params;

}



DataAcquisitionApplication.prototype._submitData = function(data, callback) {

    var me = this;

    console.log(JSON.stringify(data, null, '   '));
    console.log('Submit form');


    var formName = data._formName;
    var templateName = formName;
    if (options.parameters[templateName + '-template']) {
        templateName = templateName + '-template';
    }
    if (!options.parameters[templateName]) {
        throw 'Expecting template parameter: ' + formName + '-template, or ' + formName + ' for form';
    }
    var template = options.parameters[templateName];

    var formData = me._renderTemplate(template, data);


    console.log("Processed Form Data (" + formName + "): " + JSON.stringify(formData, null, '   '));

    me._submitHandler(formData, formName).then(function(result) {

        console.log('Submitted Form: ' + JSON.stringify(result, null, '   '));
        callback(null, result);

    }).catch(function(err) {

        console.log(err);
        callback(err);

    });



};


DataAcquisitionApplication.prototype.setSubmitHandler = function(handler) {
    this._submitHandler = handler;
}


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

    var me = this;

    me._taskIndicatorStart = start;
    me._taskIndicatorProgress = progress;
    me._taskIndicatorComplete = complete;


}



DataAcquisitionApplication.prototype.isOnline = function() {
    var me = this;
    return me._online;
}

DataAcquisitionApplication.prototype._setOnline = function() {
    var me = this;
    me._online = true;
    if (me._processOfflineIterval) {
        clearInterval(me._processOfflineIterval);
        me._processOfflineIterval = setInterval(function() {

            me._processOfflineForms();

        }, 60 * 1000);
    }
    me._processOfflineForms();
}

DataAcquisitionApplication.prototype._setOffline = function() {
    var me = this;

    if (me._processOfflineIterval) {
        clearInterval(me._processOfflineIterval);
    }

    me._online = false;
}


DataAcquisitionApplication.prototype._processOfflineForms = function() {


    var me = this;

    me.getQueuedForms().then(function(list) {

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
                        me._processFormFilePath(list.shift()._path, null, sendNext);
                    }
                }
                sendNext();
            });
        }

    }).catch(function(e) {
        console.log('Error getting list of queued items: ' + JSON.stringify(e.message || e));
    });



};
DataAcquisitionApplication.prototype._offlineFormPaths = function() {


    var me = this;


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

    return list;

};



DataAcquisitionApplication.prototype.getQueuedForms = function() {

    var me = this;

    return new Promise(function(resolve, reject) {

        var paths = me._offlineFormPaths();

        if (paths.length == 0) {
            resolve([]);
            return;
        }

        var errors = 0;
        var forms = [];

        var check = function() {
            if (errors + forms.length == paths.length) {

                var queueable = me._config().get('queuableForms', null);
                if (_isArray(queueable)) {

                    resolve(forms.filter(function(f) {
                        return queueable.indexOf(f._formName) >= 0;
                    }));

                    var invalidForms = forms.filter(function(f) {
                        return queueable.indexOf(f._formName) < 0;
                    });

                    me._cleanUpInvalidForms(invalidForms);

                } else {
                    resolve(forms);
                }


            }
        }

        paths.forEach(function(path) {
            me._getFormFileData(path).then(function(data) {



                forms.push(data);
                check();


            }).catch(function(err) {
                console.log('getQueuedForms Error: ' + JSON.stringify(err.message || err));
                errors++;
                check();
            })
        })


    });
}

DataAcquisitionApplication.prototype._cleanUpInvalidForms = function(forms) {
    console.log('Should clean up invalid forms: ' + JSON.stringify(forms));
};


DataAcquisitionApplication.prototype._processFormFile = function(filename, countItems, callback) {

    var me = this;

    var savepath = fs.knownFolders.documents().path;
    var filepath = fs.path.join(savepath, filename);
    return me._processFormFilePath(filepath, countItems, callback);


}


DataAcquisitionApplication.prototype._getFormFileData = function(filepath) {

    var me = this;

    console.log('Read Form File Json: ' + filepath);

    return new Promise(function(resolve, reject) {

        var file = fs.File.fromPath(filepath);

        file.readText().then(function(content) {
            var data = JSON.parse(content);
            data._path = filepath;
            data._lastModified = file.lastModified;
            data._tz = (new Date()).getTimezoneOffset()

            if (!data._formName) {
                data._formName = 'default';
            }

            resolve(data);
        }).catch(function(err) {
            console.log('Form File Read Error => ' + err);
            reject(err);
        });

    });



}

DataAcquisitionApplication.prototype._processFormFilePath = function(filepath, countItems, callback) {

    var me = this;


    console.log('Process Form File: ' + filepath);

    var file = fs.File.fromPath(filepath);


    var mediaFields = ['media', 'media-audio', 'media-video', 'media-image']

    file.readText().then(function(content) {
        var data;
        try {
            data = JSON.parse(content);
        } catch (e) {
            console.log('Invalid JSON: ' + content);
            throw e;
        }


        console.log('Read: ' + content)

        var media = [];
        mediaFields.forEach(function(field) {
            if (data[field]) {
                media = media.concat(data[field]);
            }
        })


        var mediaItems = mediaItemsThatNeedUploading(media);
        if (mediaItems.length) {
            if (!countItems) {
                countItems = mediaItems.length;
            }
            console.log("There are " + mediaItems.length + " items to upload: list:" + JSON.stringify(mediaItems, null, "  "));

            me.uploadMediaItem(mediaItems[0], countItems - mediaItems.length, countItems).then(function() {
                //recursive call will upload all mediaItems until done...
                console.log(mediaItemsThatNeedUploading(media).length + " items to upload");
                me._processFormFilePath(filepath, countItems, callback);



            }).catch(function(err) {
                console.error('Image Upload Error => ' + JSON.stringify(err.message || err));
                callback(err);
            })
            return;
        }



        console.log('About to submit form');
        console.log(JSON.stringify(data));

        data["media-metadata-set"] = media.map(function(item) {
            return mediaData(item);
        });

        data["media-urls"] = data["media-metadata-set"].map(function(item) {
            var preffered = 'url';
            var alsoPushTo = null;
            if (item.type) {
                preffered = item.type;
                var alsoPushToKey = 'media-' + preffered + 's';

                if (!data[alsoPushToKey]) {
                    data[alsoPushToKey] = [];
                    alsoPushTo = data[alsoPushToKey];
                }

            }
            //var meta=mediaData(item);
            var url = item[preffered] || item.url || item.image || item.video || item.audio || item.document;
            if (alsoPushTo) {
                alsoPushTo.push(url);
            }
            return url;
        });


        data.description = (data.description ? data.description : "") + media.map(function(item) {
            return mediaData(item).html;
        }).join("");
        me._submitData(data, function(err, response) {

            if (!err) {
                file.remove();
            }

            callback(err, response);

        });



    }).catch(function(err) {
        console.log('Form File Read Error => ' + err);
        callback(err);
    });

}


var mediaItemsThatNeedUploading = function(fileArray) {
    return fileArray.filter(function(mediaFile) {
        return hasFileForMedia(mediaFile) && (!hasUrlForMedia(mediaFile));
    });
}
var mediaData = function(filename) {

    var fileMetaName = filename + '.json';
    fileMetaName = fileMetaName.split('/').pop()

    var filepath = fs.path.join(fs.knownFolders.documents().path, fileMetaName);

    if (!fs.File.exists(filepath)) {
        //should only be here if filename is an actual url!
        return {
            "image": filename,
            "type": "image",
            "html": "<img src=\"" + filename + "\" />"
        };
    }

    var file = fs.File.fromPath(filepath);

    // Writing text to the file.
    var data = file.readTextSync(function(err) {
        console.log('File Read Error => ' + err.message);
    });

    console.log('Read media file:' + data);
    var json;
    try {
        json = JSON.parse(data);
    } catch (e) {
        console.log("Invalid JSON: (" + file.path + ":" + filename + ")" + data);
        throw e;
    }

    return json;
}



DataAcquisitionApplication.prototype.uploadMediaItem = function(filename, finished, total) {

    var me = this;

    var savepath = fs.knownFolders.documents().path;
    var filePath = filename[0] == '/' ? filename : fs.path.join(savepath, filename);

    filename = filename.split('/').pop();


    var file = fs.File.fromPath(filePath);

    if (!fs.File.exists(filePath)) {

        throw "File does not exist!!";
    }


    var type = "image_upload";

    if (filename.indexOf(".mp3") > 0 || filename.indexOf(".m4a") > 0) {
        type = "audio_upload";
    }

    if (filename.indexOf(".mp4") > 0) {
        type = "video_upload";
    }


    var url = me._client().getProtocol() + '://' + me._client().getUrl() + "/" + me._client().getPathForTask(type) + "&json=%7B%7D";
    var method = "POST";

    console.log('Initiating Background Upload: ' + filename);
    console.log('Post Background ' + method + ': ' + url);
    console.log('File Exists! ' + filename + " " + file.extension + " " + file.lastModified);

    if (type == "video_upload") {
        file.readText().then(function(text) {
            console.log("Video: " + text);
        })
    }

    var session = bghttp.session("media-upload");
    //var url='http://postb.in/HrtEpOOe';
    var request = {
        url: url,
        method: method,
        headers: {
            "Content-Type": "application/octet-stream",
            "File-Name": filename
        },
        description: "{ 'uploading': " + filename + " }",
        // androidDisplayNotificationProgress:false
    };


    console.log('Generating Promise For File Upload');

    console.log("about to upload: " + filePath);
    var params = [{
        name: "upload",
        filename: filePath,
        mimeType: 'image/png'
    }];
    var task = session.multipartUpload(params, request);

    if (!me._tasks) {
        me._tasks = [];
    }
    me._tasks.push(task);
    if (!me._sessions) {
        me._sessions = [];
    }
    me._sessions.push(session);



    me._taskIndicatorStart(finished, total);

    return new Promise(function(resolve, reject) {


        console.log('Executing Promise For File Upload');



        task.on("progress", function(value) {
            console.log("Upload Progress: " + JSON.stringify(value));

            var percent = (100 * parseInt(value.currentBytes) * (finished + 1)) / (parseInt(value.totalBytes) * total);
            console.log("Calculated: " + percent);
            me._taskIndicatorProgress('Uploading ' + (finished + 1) + " of " + total, percent);
        });
        task.on("error", function(err) {
            console.log("Error Uploading File: " + JSON.stringify(err.eventName || err.message || e));
            reject(err);
            me._taskIndicatorComplete(finished + 1, total);
        });
        task.on("complete", function(response) {
            console.log("Upload Complete: " + JSON.stringify(response));
            me._taskIndicatorComplete(finished + 1, total);
        });

        task.on("responded", function(response) {

            console.log('Response: ' + response.data + " " + url);
            var fileMeta;
            try {
                fileMeta = JSON.parse(response.data);
            } catch (err) {

                console.log('Upload Error => ' + JSON.stringify(err) + ' ' + response);
                reject(err);

                return;
            }


            var fileMetaName = filename + '.json';
            var file = fs.File.fromPath(fs.path.join(fs.knownFolders.documents().path, fileMetaName));

            // Writing text to the file.
            file.writeText(JSON.stringify(fileMeta))
                .then(function() {
                    console.log('stored: ' + fileMetaName + " => " + response.data);
                    resolve(fileMeta);
                }).catch(function(err) {
                    console.log('Upload Error => ' + JSON.stringify(err));
                    reject(err);
                });

        });

    });

}

var hasUrlForMedia = function(filename) {


    var name = filename.split('/').pop();

    var documents = fs.knownFolders.documents();
    var filePath = fs.path.join(documents.path, name) + '.json';
    return fs.File.exists(filePath);

}

var hasFileForMedia = function(filename) {

    if (fs.File.exists(filename)) {
        return true;
    }

    var name = filename.split('/').pop();
    var documents = fs.knownFolders.documents();
    var filePath = fs.path.join(documents.path, name);;
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



DataAcquisitionApplication.prototype.submitForm = function(formData, formName, callback) {

    var me = this;

    var callbackData = {
        isSubmitting: false,
        submittingStateLabel: ""
    }
    me._storeFormJson(formData, formName).then(function(file) {
        if (me.isOnline()) {
            me._processFormFile(file, null, function(err, response) {
                if (err) {

                    var queueable = me._config().get('queuableForms', null);
                    if (_isArray(queueable)) {
                        if (queueable.indexOf(formName) < 0) {

                            var eventData = {
                                eventName: "submitFormError",
                                object: me
                            };
                            callback(callbackData);
                            me.notify(eventData);

                            return;
                        }
                    }

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
                    object: me,
                    response: response
                };
                callback(callbackData);
                me.notify(eventData);

            });
            return;
        }

        var queueable = me._config().get('queuableForms', null);
        if (_isArray(queueable)) {
            if (queueable.indexOf(formName) < 0) {
                var eventData = {
                    eventName: "offlineFormError",
                    object: me
                };
                callback(callbackData);
                me.notify(eventData);

                return;
            }
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
            form: me._config().get("mainView", "menu"),
            data: {
                isSubmitting: true,
                submittingStateLabel: "Uploading"
            }
        }
    });

}

var generateMarkerFileName = function() {
    return global.parameters.domain + '.' + new Date().getTime() + '.data.json';
}

DataAcquisitionApplication.prototype._storeFormJson = function(data, name) {

    return new Promise(function(resolve, reject) {

        var savepath = fs.knownFolders.documents().path;
        var filename = generateMarkerFileName();
        var filepath = fs.path.join(savepath, filename);

        data._createdDate = new Date().getTime();
        data._formName = name;

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


DataAcquisitionApplication.prototype.renderApplication = function(page) {



    var me = this;
    if (me.options.parameters.shouldRegisterDevice !== false) {

        console.log('Starting Login process');

        var label = page.getViewById("loading-label");
        var setLabel = function(text) {
            if (label) {
                label.text = text;
            }
        }

        setLabel("Authenticating");
        require('../').Account.SharedInstance().login().then(function() {
            return me._runApplication(page);
        }).catch(function(e) {
            console.log('Application Startup Error With Registration: ' + JSON.stringify(e));
            console.error(e);
            console.error(e.stack);
        });

        return;
    }


    console.log('Skipped Login process');

    me._runApplication(page).catch(function(e) {
        console.log('Application Startup Error No Registration: ' + JSON.stringify(e));
        console.error(e);
        console.error(e.stack);
    });


};


DataAcquisitionApplication.prototype._runApplication = function(page) {

    var me = this;

    console.log('Starting Configuration Stage');

    var label = page.getViewById("loading-label");
    var indicator = page.getViewById("loading-indicator");

    var setLabel = function(text) {
        if (label) {
            label.text = text;
        }
    }
    var removeLabel = function() {
        if (label) {
            label.parent.removeChild(label);
        }
    }
    var removeIndicator = function() {
        if (indicator) {
            indicator.busy = false;
        }
    }
    setLabel("Loading configuration");


    var configuration = me._config();
    configuration.on('downloadingDependencies', function(event) {
        setLabel("Parsing assets");
    });

    var counter = 0;
    configuration.on('downloadedAsset', function(event) {
        setLabel("Downloading assets " + (counter++));
    });

    configuration.on('downloadedDependencies', function(event) {
        setLabel("Checking offline queue")
    });



    if (me.options.parameters.configuration === false || _isObject(me.options.parameters.configuration)) {
        configuration.setDefaultParameters(me.options.parameters.configuration || {});
    } else {
        console.log(JSON.stringify(me.options.parameters));
    }



    return configuration.getImage('appLogo').then(function(imageSource) {

        try {
            page.getViewById("logo").src = imageSource;
        } catch (err) {
            console.error(err);
            console.error("Failed to render logo: " + imageSource);
            //console.error(err.trace);
        }
        removeIndicator();



        var showSplashScreenFor = parseInt(configuration.get('splashScreenDuration', "5")) * 1000;
        console.log('Show Splash Screen: ' + showSplashScreenFor);

        var intCount = 0;
        var splashInterval = setInterval(function() {
            setLabel("" + (parseInt(showSplashScreenFor / 1000) - (intCount++)) + " Remaining");
        }, 1000);
        setTimeout(function() {
            clearInterval(splashInterval);
            var frameModule = require("ui/frame");
            var topmost = frameModule.topmost();

            if (topmost.android) {
                //topmost.android.cachePagesOnNavigate = true;
            }



            var acceptedTermsFile = fs.path.join(fs.knownFolders.documents().path, "acceptedterms.json");
            var tutorialFile = fs.path.join(fs.knownFolders.documents().path, "viewedtutorial.json");

            var showMain = function() {

                console.log("showMain");

                var tutorialFileExists = fs.File.exists(tutorialFile);
                var showTutorial = configuration.get("showTutorial", true);

                if (tutorialFileExists || (!showTutorial) || (!me._renderer().hasView('tutorial'))) {

                    console.log("Skip Tutorial: `showTutorial`=" + (showTutorial ? "true" : "false") + " `tutorialWasViewed`=" + (tutorialFileExists ? "true" : "false"));
                    // return;
                    topmost.navigate({

                        moduleName: "views/form/form",
                        clearHistory: true,
                        //backstackVisible:false,
                        context: {
                            form: configuration.get("mainView", "menu")
                        }

                    });
                    return;
                }

                var file = fs.File.fromPath(tutorialFile);
                file.writeText("{}");

                topmost.navigate({

                    moduleName: "views/form/form",
                    clearHistory: true,
                    //backstackVisible:false,
                    context: {
                        form: "tutorial",
                        events: {
                            "complete": function() {
                                console.log("User Triggered Event (tutorial): `complete` showMain()");
                                showMain();
                            }
                        }
                    }

                });

            };

            var acceptedTermsFileExists = fs.File.exists(acceptedTermsFile);
            var showTerms = configuration.get("showTerms", true);

            if (acceptedTermsFileExists || (!showTerms) || (!me._renderer().hasView('terms'))) {
                console.log("Skip Terms Of Use: `showTerms`=" + (showTerms ? "true" : "false") + " `acceptedTerms`=" + (acceptedTermsFileExists ? "true" : "false"));
                showMain();
                return;
            }

            topmost.navigate({

                moduleName: "views/form/form",
                clearHistory: true,
                //backstackVisible:false,
                context: {
                    form: "terms",
                    events: {
                        "accept": function() {
                            console.log("User Triggered Event (terms): `accept` showMain()");
                            var file = fs.File.fromPath(acceptedTermsFile);
                            file.writeText("{}");
                            showMain();
                        }
                    }
                }

            });


        }, showSplashScreenFor);

    });



}


module.exports = DataAcquisitionApplication;