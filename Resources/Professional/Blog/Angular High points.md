
<div class="post">
	<h1>Angular High points</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Been a while since I posted on here so I thought i&#x27;d document the high points of the latest thing im learning: Angular 2. Im not going to go over the step by step as that is covered in the docs at angular.io but rather I want to focus on some concepts that are interesting to Angular 2 (A2 for the remainder).&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Edit: This post is 6mo old now. In the Angular world that&#x27;s ancient haha. Ill update it soon. For now, you should check out cli.angular.io to start a new project.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h4 id&#x3D;&quot;angular2firstimpressions&quot;&gt;Angular 2 First Impressions&lt;/h4&gt;
&lt;p&gt;Angular 2 is a major departure from previous styles of doing things in an MV* framework. ( Angular Included ). A lot of decisions are made for you but If they are good decisions I don&#x27;t see that as a problem. For instance, Typescript is the lingua franca of choice and angular makes heavy use of composeable interfaces that are built out of classes, components, and annotated decorators.  Don&#x27;t worry if this seems a mile above the language you&#x27;re used to. We&#x27;re going to explore these terms and how they fit together as we go.&lt;/p&gt;
&lt;p&gt;At first, my initial impression was that angular 2 was a bit scattered and not as unified of a solution as I would like. Out of the box the quick start didn&#x27;t work for me, a book I was reading used different packages than the official quickstart and it struck me as weird that the framework blended together so many third party tools to make it actually function. You have this module loader here to load the modules, this library here to monitor the DOM for changes, that thing there to ensure browser compatibility. It feels like builing a strung together app for a business rather than just running through a streamlined quick start. I have to say though, once things are up and running, I think the way they advocate building applications in A2 feels like slipping on a comfortable glove. It just fits right, not like OJ&#x27;s glove. :p&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Angular 2&#x27;s style of building applications with classes and components fit&#x27;s like a familiar glove. Comfortable and just right.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h5 id&#x3D;&quot;themercurialsetup&quot;&gt;The Mercurial Setup&lt;/h5&gt;
&lt;p&gt;If you have never built an SPA before this can be kind of tedious and a bit overwhelming. My initial thought was not to cover this but I changed my mind as it is important for to make sure you have a solid understanding of the basics before building. So to set this bad boy up you create an initial entry point for your app where you load your javascript files and your initial module.&lt;/p&gt;
&lt;p&gt;The initial module, sometimes called your bootstrap file. Many times this file is called main.js or something to that effect. Since we&#x27;re using TypeScript you will see files with a naming convention of main.js.&lt;em&gt;ts&lt;/em&gt;. So to get things kicked off head over to the angular.io site and copy their setup files, package.json, typescript config files and so on into your app root. Then do an npm install. Next here is how your index.html should look:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;html&amp;gt;
  &amp;lt;head&amp;gt;
    &amp;lt;title&amp;gt;Angular 2 Intro&amp;lt;/title&amp;gt;
    &amp;lt;meta charset&#x3D;&amp;quot;UTF-8&amp;quot;&amp;gt;
    &amp;lt;meta name&#x3D;&amp;quot;viewport&amp;quot; content&#x3D;&amp;quot;width&#x3D;device-width, initial-scale&#x3D;1&amp;quot;&amp;gt;
    &amp;lt;link rel&#x3D;&amp;quot;stylesheet&amp;quot; href&#x3D;&amp;quot;packages/app/public/styles/css/styles.css&amp;quot;&amp;gt;    
    
    &amp;lt;!-- 1. Load libraries --&amp;gt;
     &amp;lt;!-- Polyfill(s) for older browsers --&amp;gt;
    &amp;lt;script src&#x3D;&amp;quot;node_modules/core-js/client/shim.min.js&amp;quot;&amp;gt;&amp;lt;/script&amp;gt;
    &amp;lt;script src&#x3D;&amp;quot;node_modules/zone.js/dist/zone.js&amp;quot;&amp;gt;&amp;lt;/script&amp;gt;
    &amp;lt;script src&#x3D;&amp;quot;node_modules/reflect-metadata/Reflect.js&amp;quot;&amp;gt;&amp;lt;/script&amp;gt;
    &amp;lt;script src&#x3D;&amp;quot;node_modules/systemjs/dist/system.src.js&amp;quot;&amp;gt;&amp;lt;/script&amp;gt;

    &amp;lt;!-- 2. Configure SystemJS --&amp;gt;
    &amp;lt;script src&#x3D;&amp;quot;systemjs.config.js&amp;quot;&amp;gt;&amp;lt;/script&amp;gt;
    
    &amp;lt;script&amp;gt;
      System.import(&#x27;app&#x27;).catch(function(err){ console.error(err); });
    &amp;lt;/script&amp;gt;
  &amp;lt;/head&amp;gt;
  
    &amp;lt;!-- 3. Display the application --&amp;gt;      
    &amp;lt;div class&#x3D;&amp;quot;container&amp;quot;&amp;gt;
      &amp;lt;App&amp;gt;&amp;lt;/App&amp;gt; &amp;lt;!-- Our app loads here! --&amp;gt;
    &amp;lt;/div&amp;gt;
  &amp;lt;/body&amp;gt;
&amp;lt;/html&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;I know it&#x27;s a monitor full. Let&#x27;s break it down.&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;Shim.js is a tool to ensure compatibility with older browsers.&lt;/li&gt;
&lt;li&gt;Zone.js watches the dom for file changes&lt;/li&gt;
&lt;li&gt;Reflect is what allows you to make annotations for your components&lt;/li&gt;
&lt;li&gt;system.js is the chosen module loader for angular 2.&lt;/li&gt;
&lt;/ol&gt;
&lt;blockquote&gt;
&lt;p&gt;If you have a problem after doing npm start try doing a global install of system js and typescript.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h5 id&#x3D;&quot;sowhereisthescripttagforourmainappfilethough&quot;&gt;So where is the script tag for our main app file though?&lt;/h5&gt;
&lt;p&gt;So your main app file is what bootstraps the application. It is pulled in via system.js and so is each subsequent module as well. Here is what a sample of that looks like:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;import { bootstrap }    from &#x27;@angular/platform-browser-dynamic&#x27;;

import { AppComponent } from &#x27;./app.component&#x27;;

bootstrap(AppComponent); 
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;If you&#x27;re wondering how system.js knows what to do and how to do it, you can  take a look at the systemjs config file that you copied from the angular.io quickstart.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Bootstrapping is only done once typically and then you just import the component class and the modules you are working with after that point.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h5 id&#x3D;&quot;wadingintothecomponentpool&quot;&gt;Wading into the component pool&lt;/h5&gt;
&lt;p&gt;Angular&#x27;s core strength is in teaching the browser how to build new elements. These elements are self contained building blocks that have their own behavior and personality. These self defined elements are called &lt;strong&gt;components&lt;/strong&gt;.&lt;/p&gt;
&lt;p&gt;So A2 builds things based on components, like any good app should be built. You start with a root component and just add on top of that. Each component is built out of a class, and annotations that describe / decorate that class.&lt;/p&gt;
&lt;p&gt;Even the framework itself is composeable. You &lt;em&gt;import&lt;/em&gt; the parts of it you need. As the quick start on the Angular site says, there is a general three part process that you follow to build components:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;You import the framework code / modules you will need to build your app.&lt;/li&gt;
&lt;li&gt;You describe how your component will behave through annotations that are called component decorators.&lt;/li&gt;
&lt;li&gt;You create a class that is responsible for appearance and behaviour of the view.&lt;/li&gt;
&lt;/ol&gt;
&lt;p&gt;&lt;em&gt;Optionally, many people like to also define models that the instances of the class will use, thereby separating the data from the view logic.&lt;/em&gt;&lt;/p&gt;
&lt;p&gt;Let&#x27;s take a look at an example below:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;import { Component } from &#x27;@angular/core&#x27;;

@Component({
  selector: &#x27;app&#x27;,
  template: &#x60;&amp;lt;h1&amp;gt;Hello World! I&#x27;m Angular 2&amp;lt;/h1&amp;gt;&#x60;
})

export class AppComponent { }


&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The takeaway&#x27;s of the code above are:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;the selector is the tagname that we are creating.&lt;/li&gt;
&lt;li&gt;Notice the template goes in the component annotation, also we are using backticks instead of single quites. This is a nifty ECMAScript6 feature that typescript allows us to utilize. It let&#x27;s us do things like multiline strings, variable interpolation, and more.&lt;/li&gt;
&lt;/ol&gt;
&lt;p&gt;You can also nest components, let&#x27;s imagine we were writing a blog application. We can nest article components inside of parent components. Let&#x27;s look at extending the previous example:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;import { Component } from &#x27;@angular/core&#x27;;
import { ArticleComponent } from &#x27;./article.component&#x27;;

@Component({
  selector: &#x27;app&#x27;,
  directives: [ArticleComponent],
  template: &#x60;&amp;lt;h1&amp;gt;Hello World! I&#x27;m Angular 2&amp;lt;/h1&amp;gt;&amp;lt;Article&amp;gt;&amp;lt;/Article&amp;gt;&#x60;
})

export class AppComponent { }

&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;In order to use a component in another component, you have to tell the parent component to expect the child component. The way to do that is to first import the component, then to register it by putting it in the directives array of your parent component.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;conclusion&quot;&gt;Conclusion&lt;/h5&gt;
&lt;p&gt;As you can see, this is an interesting approach to building things with angular. It&#x27;s a composable, class based approach that mitigates much of the former criticism associated with building JavaScript apps.   People coming from other languages looking for more classical based paradigms or features such as strict typing should feel right at home learning angular 2.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

