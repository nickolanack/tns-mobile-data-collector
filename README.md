# tns-mobile-data-collector

Create Mobile Crowdsourced Spatial Data Apps. 

define forms, views etc using parameters.json
```js
// ./app/parameters.json
{
 
  /* 
   * domain must be https! this is were your forms are submitted to,
   * and is the base url for resolving configuration and other   urls
   */
  "domain":"somedomain.ca", 
  
  /*
   * name or type of gis application server this parameter is used to determine 
   * how the app communicates to the server only "core-app" is supported.
   */
  "provider":"core-app",
  /*
   * this could be an object like {parameters:{"key":"value", ...}}
   * if this is a string, then it is used in a request to {domain} for values.
   * once configuration is resolved the app can run offline.
   */
  "configuration":"config-name" 


}


```
