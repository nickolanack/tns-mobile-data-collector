var value={
   "id": 99,
   "point": [
      49.8428258,
      -119.6672134,
      0
   ],
   "name": "One - Snow and Ice",
   "icon": "components/com_geolive/users_files/user_files_20/Uploads/DYV_[G]_9im_[ImAgE]_lEI.png?thumb=64x64",
   "description": "Two<img src=\"components/com_geolive/users_files/user_files_816/Uploads/nH8_[G]_l2c_FqR_[ImAgE].png\" />",
   "type": "marker",
   "lid": 1,
   "modificationDate": "2018-08-20 17:45:48",
   "creationDate": "2018-08-20 17:45:48",
   "edited": false,
   "queued": false
}
var fields=[
   {
      "type": "split",
      "left": {
         "type": "image",
         "size": {
            "w": 128,
            "h": 128
         },
         "image": "{value.icon}"
      },
      "right": {
         "type": "label",
         "value": "Created {value.creationDate|dateFromNow}",
         "className": "time"
      }
   },
   {
      "type": "split",
      "className": "item {item-value.queued|?`queued-item`:``}",
      "right": [
         {
            "type": "label",
            "condition": "{item-value.queued}",
            "value": "Queued For Upload{item-value.edited|?` (Edited)`:``}"
         },
         {
            "type": "heading",
            "value": "{value.name}",
            "placeholder": "empty name"
         },
         {
            "condition": "{{value.description|images}.length}",
            "type": "image",
            "image": "{{value.description|images}.0.url}?thumb=300x300&clip",
            "action": "view",
            "view": "markerDetail",
            "data": "{value}"
         },
         {
            "type": "layout",
            "template": "flexbox-bar",
            "name": "media-bar",
            "className": "item-media",
            "left": [
               {
                  "condition": "{{value.description|audios}.length}",
                  "type": "audio",
                  "icon": "{audio-icon}",
                  "audio": "{{value.description|audios}.0.url|url}"
               }
            ],
            "right": [
               {
                  "condition": "{{value.description|videos}.length}",
                  "type": "video",
                  "icon": "{video-icon}",
                  "video": "{{value.description|videos}.0.url|url}"
               },
               {
                  "type": "icon",
                  "condition": "{item-value.queued|?false:true}",
                  "name": "test-delete",
                  "className": "small-icon",
                  "icon": "{delete}",
                  "action": "submit",
                  "data": {
                     "id": "{value.id}"
                  },
                  "offlineQueue": false,
                  "confirm": "Delete this item?"
               },
               {
                  "type": "icon",
                  "condition": "{item-value.queued|?false:true}",
                  "className": "small-icon",
                  "icon": "{edit}",
                  "action": "form",
                  "form": "edit-waypoint",
                  "data": {
                     "id": "{value.id}",
                     "title": "{value.name|split(-)|slice(0,-1)|join(-)|trim}",
                     "description": "{value.description|stripTags|trim}",
                     "type": "{value.name|split(-)|pop|trim}",
                     "coordinates": [
                        "{value.point.0}",
                        "{value.point.1}",
                        "{value.point.2}"
                     ],
                     "media": "{value.description|images|=>(url)}",
                     "media-audio": "{value.description|audios|=>(url)}",
                     "media-video": "{value.description|videos|=>(url)}"
                  }
               },
               {
                  "type": "icon",
                  "condition": "{item-value.queued|?false:true}",
                  "action": "share",
                  "link": "https://alpine.geolive.ca/mapitem-{value.id}",
                  "linkLabel": "Share {value.name}",
                  "linkTargetType": "story",
                  "icon": "{share}",
                  "className": "small-icon"
               }
            ]
         }
      ]
   }
];

var params={
   "domain": "alpine.geolive.ca",
   "pusherAppChannelPrefix": "",
   "--domain": "192.168.2.1:8001",
   "--protocol": "http",
   "--pusherAppChannelPrefix": "dev.local.",
   "pusherAppKey": "XXXX_XXXX",
   "pusherCluster": "us2",
   "queuableForms": [
      "create-waypoint",
      "edit-waypoint"
   ],
   "provider": "core-app",
   "appName": "The Alpine App",
   "appOwner": "The Alpine Club",
   "appContactNumber": "1-800-555-5555",
   "mainView": "menu",
   "showTerms": true,
   "showTutorial": true,
   "styleUrl": "{app-style}",
   "layer": 1,
   "configuration": "mobile-app-config",
   "create-waypoint-template": {
      "marker": {
         "name": "{data.title} - {data.step-2.type}",
         "description": "{data.description}",
         "coordinates": "{data.coordinates}",
         "style": "DEFAULT"
      },
      "attributes": {
         "markerAttributes": {
            "type": "{data.step-2.type}"
         }
      },
      "layerId": "{layer}"
   },
   "edit-waypoint-template": {
      "id": "{data.id}",
      "marker": {
         "name": "{data.title} - {data.step-2.type}",
         "description": "{data.description}",
         "coordinates": "{data.coordinates}",
         "style": "DEFAULT"
      },
      "attributes": {
         "markerAttributes": {
            "type": "{data.step-2.type}"
         }
      },
      "layerId": "{layer}"
   },
   "profile-template": {
      "widget": "saveProfile",
      "profile": "{data.media-images}",
      "name": "{data.name}"
   },
   "authorize-template": {
      "widget": "authorizeEmail",
      "email": "{data.email}"
   },
   "test-delete-template": {
      "widget": "deleteItem",
      "item": "{data.id}"
   },
   "disconnect-template": {
      "widget": "deauthorizeEmail"
   },
   "views": {
      "terms-inner": "{terms.json}",
      "terms": [
         {
            "type": "button",
            "position": "bottom-center",
            "label": "I Accept",
            "className": "submit",
            "action": "event",
            "event": "accept"
         },
         {
            "type": "fieldset",
            "fields": "{terms.json}"
         }
      ],
      "developer": "{developer.json}",
      "tutorial-inner": "{tutorial.json}",
      "tutorial": [
         {
            "type": "button",
            "position": "bottom-center",
            "label": "Skip",
            "action": "event",
            "event": "complete",
            "className": "submit"
         },
         {
            "type": "fieldset",
            "fields": "{tutorial.json}"
         }
      ],
      "list": "{list.json}",
      "menu": "{menu.json}",
      "about": "{about.json}",
      "authorize": "{authorize.json}",
      "profile": "{profile.json}",
      "map": "{map.json}",
      "progress": "{progress.json}",
      "create-waypoint": "{form.json}",
      "edit-waypoint": "{edit.json}",
      "folder": [
         {
            "type": "heading",
            "value": "Your Waypoints"
         },
         {
            "type": "list",
            "values": "getUsersList",
            "empty": "You have not created any waypoints"
         }
      ],
      "markerDetail": [
         {
            "type": "image",
            "image": "{{data.description|images}.0.url}"
         }
      ],
      "test-media": "{test-media.json}"
   },
   "provisioningKey": "XXXX_XXXX",
   "appLogo": [
      "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_kdO_[G]_HqE_8hq.png"
   ],
   "splashScreenDuration": "1",
   "profile-image": [
      "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_98d_ovP_mli_[G].png"
   ],
   "create-marker": [
      "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_lHB_[G]_IhE_fcB.png"
   ],
   "create-marker-label": "Add Story",
   "add-audio": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_SF7_[ImAgE]_UXB_rKf.png"
   ],
   "add-video": [
      "components/com_geolive/users_files/user_files_20/Uploads/NNS_[G]_z7I_Bwx_[ImAgE].png"
   ],
   "add-image": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_[ImAgE]_4Ll_svI_xCP.png"
   ],
   "add-image-library": [
      "components/com_geolive/users_files/user_files_20/Uploads/aG9_[ImAgE]_v20_GPI_[G].png"
   ],
   "record-audio": [
      "components/com_geolive/users_files/user_files_20/Uploads/3sS_72H_[G]_[ImAgE]_fOo.png"
   ],
   "preview-audio": [
      "components/com_geolive/users_files/user_files_20/Uploads/Th9_Lz4_[ImAgE]_CAw_[G].png"
   ],
   "remove-media": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_3ny_[ImAgE]_q5R_3PI.png"
   ],
   "map": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_[ImAgE]_jBt_Eiq_7Xd.png"
   ],
   "map-label": "Map",
   "folder": [
      "components/com_geolive/users_files/user_files_20/Uploads/LYm_[G]_9uQ_[ImAgE]_36D.png"
   ],
   "folder-label": "My Stories",
   "downloads": [
      "components/com_geolive/users_files/user_files_20/Uploads/Gc9_1EX_[G]_3ST_[ImAgE].png"
   ],
   "profile": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_TW_[ImAgE]_kMg_jYe.png"
   ],
   "share": [
      "components/com_geolive/users_files/user_files_20/Uploads/8q1_[G]_FbD_[ImAgE]_39l.png"
   ],
   "edit": [
      "components/com_geolive/users_files/user_files_20/Uploads/Uoz_Zcs_[ImAgE]_[G]_tU6.png"
   ],
   "delete": [
      "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_qok_[G]_qUC_O8H.png"
   ],
   "auth": [
      "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_WDR_CMl_[G]_Ord.png"
   ],
   "downloads-label": "More",
   "dialog-offline-title": "Offline Mode",
   "dialog-offline-message": "This app can run offline but will require an internet connection at a later date to submit forms",
   "dialog-offlineunavailable-title": "Unable to connect to app server",
   "dialog-offlineunavailable-message": "This app needs to connect to the internet on first use.",
   "dialog-processqueue-title": "Sending Offline Forms",
   "dialog-processqueue-message": "There are {{list.length}} offline forms to submit",
   "dialog-addqueueitem-title": "Form Queued",
   "dialog-addqueueitem-message": "This form will be submitted the next time you connect to the internet",
   "dialog-submitformerror-title": "Failed to submit form",
   "dialog-submitformerror-message": "Don't worry we'll keep trying",
   "dialog-submitform-title": "Form Submited",
   "app-style": "https://alpine.geolive.ca/app-style.content",
   "survey": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_[ImAgE]_bXM_RXx_93i.png"
   ],
   "about": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_DF2_UNL_[ImAgE]_mRh.png"
   ],
   "uploads": [
      "components/com_geolive/users_files/user_files_20/Uploads/omI_v7u_[G]_8Yp_[ImAgE].png"
   ],
   "includes": [
      "mobile-app-markers",
      ""
   ],
   "terms": "<h1>\r\nTerms of Use\r\n</h1>\r\n\r\nThe Alpine Club of Canada (ACC) Mountain App and interactive website (hereafter referred to as the &quot;Application&quot;) is intended to promote information and story sharing about mountain environments and self-propelled experiences between members of the club.  \r\n<br>\r\n<br>\r\nBy using the Application, you agree to the following Terms of Use.\r\n<br>\r\n<br>\r\n<h1>\r\n1. Amendments\r\n</h1>\r\n\r\nThis Agreement may be amended by The Alpine Club of Canada from time to time without specific advance notice to you.  The latest Agreement will be posted on the Application, and you should review the Agreement prior to using the Application.\r\n<br>\r\n<br>\r\n<h1>\r\n2. Editing, Deleting and Modification\r\n</h1>\r\n\r\nThe Alpine Club of Canada reserves the right in its sole discretion to edit the Application, including any documents, information or other content appearing on the Application whether submitted by users or by other parties.\r\n<br>\r\n<br>\r\n<h1>\r\n3. Assumption of Risk\r\n</h1>\r\n\r\nYou agree that your use of the Application is at your own risk. You acknowledge that you are aware of the risks inherent in the use of the Application, including the possibility of physical injury, property damage, damage to software or data, or other losses. You nevertheless freely and voluntarily assume these risks.\r\n<br>\r\n<br>\r\n<h1>\r\n4. Limitation of Liability\r\n</h1>\r\n\r\nIN NO EVENT SHALL THE ALPINE CLUB OF CANADA, OR ITS DIRECTORS, OFFICERS, EMPLOYEES, INSTRUCTORS, ASSISTANT INSTRUCTORS, GUIDES, LEADERS, MEMBERS, GUESTS, VOLUNTEERS, AGENTS, INDEPENDENT CONTRACTORS, SUBCONTRACTORS, REPRESENTATIVES, SUCCESSORS AND ASSIGNS, AND ANY OTHER PERSON OR ORGANIZATION PARTICIPATING IN OR CONNECTED WITH THE ACTIVITIES OF THE CLUB (THE ALPINE CLUB OF CANADA PARTIES) BE LIABLE WHATSOEVER FOR YOUR USE OF THE APPLICATION. IN PARTICULAR, BUT NOT AS A LIMITATION THEREOF, THE ALPINE CLUB OF CANADA AND THE ALPINE CLUB OF CANADA PARTIES SHALL NOT BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGES, EXPENSE, DEATH OR INJURY RELATED TO USE OF THE APPLICATION, WHETHER BASED ON BREACH OF CONTRACT, BREACH OF WARRANTY, TORT (INCLUDING NEGLIGENCE) OR OTHERWISE. \r\n<br>\r\n<br>\r\n<h1>\r\n5. Disclaimer\r\n</h1>\r\n\r\nTHE ALPINE CLUB OF CANADA PROVIDES THE APPLICATION AS IS, AS AVAILABLE AND ALL WARRANTIES, EXPRESS OR IMPLIED, ARE DISCLAIMED (INCLUDING BUT NOT LIMITED TO THE DISCLAIMER OF ANY IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE).\r\n<br>\r\n<br>\r\n<h1>\r\n6. Indemnification\r\n</h1>\r\n\r\nYou agree to indemnify, defend and hold The Alpine Club of Canada and The Alpine Club of Canada Parties harmless from any liability, loss, claim and expense, including reasonable legal fees, related to your violation of this Agreement or your use of the Application.\r\n<br>\r\n<br>\r\n<h1>\r\n7. Use of Personal Information\r\n</h1>\r\n\r\nThe Alpine Club of Canada reserves the right, and you authorize The Alpine Club of Canada, to the use and assignment of all information regarding your use of the Application and all personal information provided by you in any manner consistent with The Alpine Club of Canada&#39;s privacy policy.\r\n<br>\r\n<br>\r\n<h1>\r\n8. Responsibility of Contributors \r\n</h1>\r\n\r\nIf you use the Application to post photos, audio, video, text or other material (hereafter referred to as &quot;Content&quot;), you are entirely responsible for the content of, and any harm resulting from, that Content. By making Content available, you represent and warrant that:\r\n<br>\r\n<br>\r\n- you own and control all of the rights to the Content that you post or you otherwise have the right to post such Content\r\n<br>\r\n<br>\r\n- the Content is not libelous or defamatory, does not contain threats or incite violence towards individuals or entities, and does not violate the personal privacy rights of any third party\r\n<br>\r\n<br>\r\n- the Content is not spam and is not machine- or randomly-generated, and does not promote commercial interests \r\n<br>\r\n<br>\r\n<h1>\r\n9. Use of Content\r\n</h1>\r\n\r\nBy submitting Content to the Application, you grant The Alpine Club of Canada a world-wide, royalty-free, and non-exclusive license to reproduce, modify, adapt and publish the Content for the purpose of displaying, distributing and promoting the observations and stories of its members. \r\n<br>\r\n<br>\r\nIf you delete Content, The Alpine Club of Canada will use reasonable efforts to remove it from the Application website, but you acknowledge that caching or references to the Content may not be made unavailable immediately.\r\n<br>\r\n<br>\r\n<h1>\r\n10. Termination of Use\r\n</h1>\r\n\r\nThe Alpine Club of Canada has the right (though not the obligation), in its sole discretion, to terminate or deny access to and use of the Application to any individual or entity for any reason. In the event of any such termination, The Alpine Club of Canada will have no obligation to provide any indemnity to that individual or entity.\r\n<br>\r\n<br>\r\n<h1>\r\n11. Non-Commercial Use \r\n</h1>\r\n\r\nYou agree not to use the Application for any commercial purpose.\r\n<br>\r\n<br>\r\n<h1>\r\n12. Non-transferable\r\n</h1>\r\n\r\nYour right to use the Application is not transferable. Any password or right given to you to obtain access is not transferable.\r\n<br>\r\n<br>\r\n<h1>\r\n13. Contact Information\r\n</h1>\r\n\r\nAny questions about this Agreement can be directed to The Alpine Club of Canada at  <a href=\"mailto:info@alpineclubofcanada.ca\" target=\"_blank\">info@alpineclubofcanada.ca</a> or 403-678-3200 ext. 0.\r\n<br>",
   "tutorial-html1": "<h2>Overview</h2>\r\n\r\nThe Alpine Club of Canada (ACC) Mountain App and interactive website is intended to promote information and story sharing about mountain environments and self-propelled experiences between members of the club.Â \r\n<br/><br/>\r\nYou can use it to tell stories about your outdoor adventures and club trips, and to document mountain flora, fauna, glaciers, past human history, route information and any other interesting or notable things you see while travelling in the mountains.  \r\n<br/><br/>\r\nOver time, the collective contributions of our members will provide a rich narrative documenting the clubâs activities and the changing state of mountain environments in Canada.\r\n<br/><br/>\r\n<h2>To get started:</h2>\r\n\r\nClick Add Story on the main screen to take a photo of where you are. Your photo will be used to locate your position in latitude and longitude and to capture the time and date of your story.\r\n<br/>",
   "tutorial-html2": "<br/>\r\nOn the next screen, add other information if you want â title, description, another photo, video, sound - to complete your story.  Click Next.\r\n<br/>",
   "tutorial-html3": "<br/>\r\nSelect a category for tagging your story... then click Save and your story will be uploaded and shared on the interactive map.\r\n<br/>",
   "tutorial-html4": "<h2>Viewing stories on the map</h2>\r\n\r\nFrom the main screen, click Map to see stories that have been submitted by you and other users.  \r\nYou may also view the Map through a web browser at: <a href=\"https://alpine.geolive.ca\">alpine.geolive.ca.</a>\r\n<br/>",
   "tutorial-html5": "<h2>Viewing and deleting your stories</h2>\r\n\r\nFrom the main screen, click My Stories to view or delete the stories you have submitted.\r\n<br/>",
   "tutorial-html6": "<h2>Configuring your profile</h2>\r\n\r\nFrom the main screen, click Profile to add a photo and your name to your profile. These will be visible to other users when you post stories.\r\n<br/>",
   "audio-icon": [
      "components/com_geolive/users_files/user_files_20/Uploads/[G]_[ImAgE]_dU5_Sal_Xyh.png"
   ],
   "video-icon": [
      "components/com_geolive/users_files/user_files_20/Uploads/kGs_[G]_vP_[ImAgE]_WBM.png"
   ],
   "image-icon": [],
   "water": [
      "components/com_geolive/users_files/user_files_23/Uploads/wb1_[ImAgE]_D8r_Z1f_[G].png"
   ],
   "water-color": "rgb(1, 105, 134)",
   "water-color-active": "rgb(1, 105, 134)",
   "rocks": [
      "components/com_geolive/users_files/user_files_23/Uploads/md_crU_sjw_[G]_[ImAgE].png"
   ],
   "rocks-color": "rgb(149, 84, 5)",
   "rocks-color-active": "rgb(149, 84, 5)",
   "plants": [
      "components/com_geolive/users_files/user_files_23/Uploads/[ImAgE]_nEX_DRz_NMi_[G].png"
   ],
   "plants-color": "rgb(44, 100, 34)",
   "plants-color-active": "rgb(44, 100, 34)",
   "humans": [
      "components/com_geolive/users_files/user_files_23/Uploads/Fhd_bpY_[G]_[ImAgE]_LG.png"
   ],
   "humans-color": "rgb(200, 71, 2)",
   "humans-color-active": "rgb(200, 71, 2)",
   "bragging": [
      "components/com_geolive/users_files/user_files_23/Uploads/qNR_rJh_[G]_[ImAgE]_58.png"
   ],
   "bragging-color": "rgb(0, 3, 103)",
   "bragging-color-active": "rgb(0, 3, 103)",
   "snow-and-ice": [
      "components/com_geolive/users_files/user_files_20/Uploads/GrK_iXX_eTQ_[G]_[ImAgE].png"
   ],
   "snow-and-ice-color": "rgb(36, 84, 136)",
   "snow-and-ice-color-active": "rgb(36, 84, 136)",
   "vista": [
      "components/com_geolive/users_files/user_files_20/Uploads/Wef_dmW_gS9_[ImAgE]_[G].png"
   ],
   "vista-color": "rgb(251, 211, 10)",
   "vista-color-active": "rgb(251, 211, 10)",
   "account-authorized": true,
   "wildlife": [
      "components/com_geolive/users_files/user_files_23/Uploads/Oi1_[ImAgE]_[G]_V24_hdh.png"
   ],
   "wildlife-color": "rgb(126, 25, 25)",
   "wildlife-color-active": "rgb(126, 25, 25)",
   "client": {
      "id": 847,
      "username": "android_pixel.824.832",
      "name": "Android Pixel 832",
      "email": "device.824.832@alpine.geolive.ca",
      "attributes": {
         "authEmail": "",
         "authEmailStatus": "",
         "authorizedEmail": "",
         "profileImage": "",
         "profileName": "",
         "id": 179
      }
   },
   "account-profile-image": [
      "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_98d_ovP_mli_[G].png"
   ],
   "account-name": "Android Pixel 832",
   "mobile-app-markers": {
      "icons": [
         "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_BmR_nvp_[G]_XFE.png",
         "components/com_geolive/users_files/user_files_20/Uploads/[G]_OTs_7F8_4FY_[ImAgE].png",
         "components/com_geolive/users_files/user_files_20/Uploads/u4D_6Si_[G]_[ImAgE]_FWZ.png",
         "components/com_geolive/users_files/user_files_20/Uploads/[G]_[ImAgE]_S88_tJt_MA3.png",
         "components/com_geolive/users_files/user_files_20/Uploads/wjI_jjl_[ImAgE]_xss_[G].png",
         "components/com_geolive/users_files/user_files_20/Uploads/sVx_[G]_[ImAgE]_e0t_AHk.png",
         "components/com_geolive/users_files/user_files_20/Uploads/DYV_[G]_9im_[ImAgE]_lEI.png",
         "components/com_geolive/users_files/user_files_20/Uploads/nOS_[ImAgE]_p5M_[G]_BMZ.png"
      ],
      "names": [
         "Wildlife",
         "Water",
         "Rocks",
         "Plants",
         "Humans",
         "Bragging",
         "Snow and Ice",
         "Vista"
      ],
      "options": [
         "",
         "",
         "",
         "",
         "",
         "",
         "",
         ""
      ],
      "iconset": [
         {
            "name": "Wildlife",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/[ImAgE]_BmR_nvp_[G]_XFE.png",
            "options": ""
         },
         {
            "name": "Water",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/[G]_OTs_7F8_4FY_[ImAgE].png",
            "options": ""
         },
         {
            "name": "Rocks",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/u4D_6Si_[G]_[ImAgE]_FWZ.png",
            "options": ""
         },
         {
            "name": "Plants",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/[G]_[ImAgE]_S88_tJt_MA3.png",
            "options": ""
         },
         {
            "name": "Humans",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/wjI_jjl_[ImAgE]_xss_[G].png",
            "options": ""
         },
         {
            "name": "Bragging",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/sVx_[G]_[ImAgE]_e0t_AHk.png",
            "options": ""
         },
         {
            "name": "Snow and Ice",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/DYV_[G]_9im_[ImAgE]_lEI.png",
            "options": ""
         },
         {
            "name": "Vista",
            "url": "components/com_geolive/users_files/user_files_20/Uploads/nOS_[ImAgE]_p5M_[G]_BMZ.png",
            "options": ""
         }
      ]
   },
   "item-value": {
      "id": 99,
      "point": [
         49.8428258,
         -119.6672134,
         0
      ],
      "name": "One - Snow and Ice",
      "icon": "components/com_geolive/users_files/user_files_20/Uploads/DYV_[G]_9im_[ImAgE]_lEI.png?thumb=64x64",
      "description": "Two<img src=\"components/com_geolive/users_files/user_files_816/Uploads/nH8_[G]_l2c_FqR_[ImAgE].png\" />",
      "type": "marker",
      "lid": 1,
      "modificationDate": "2018-08-20 17:45:48",
      "creationDate": "2018-08-20 17:45:48",
      "edited": false,
      "queued": false
   },
   "data": {
      "isSubmitting": false,
      "submittingStateLabel": "",
      "listLoading": false
   }
}
var Template = require('../').Template;
var template = Template.SharedInstance();

console.log(JSON.stringify(template.prepareTemplate(value, params, fields),null, '   '));
// console.log(JSON.stringify(template.prepareTemplate(value, params, {
// 	"description": "{value.description|stripTags|trim}",
// }),null, '   '));





						//console.log(JSON.stringify(fields, null, '   '));