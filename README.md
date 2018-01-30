# tns-mobile-data-collector

Create Mobile Crowdsourced Spatial Data Apps. 

define forms, views etc using parameters.json
```js
// ./app/parameters.json
{
 
  /* 
   * domain must be https! (or a local ip address) this is were your forms are submitted to,
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
  "configuration":"config-name",

  /**
   * this is the default view to show. unless a named view is specified. form submission returns to this view
   * for testing point directly to any view.
   */
  "mainView":"main",

  "views":{
      /**
       * Terms of use. first page shown to user
       */
      "terms":[], 

      /**
       * Tutorial. second page shown to user. this is only shown on first use
       */
      "tutorial":[],

      /**
       * 
       */

      "main":[]

      /**
       * named views/forms etc.
       */
      ...
  }


}


```
