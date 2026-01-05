
<div class="post">
	<h1>Deconstructing MEAN.IO</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Im a big believer that you cannot truly understand a system or platform unless you understand the sum of it&#x27;s parts. Weather you are talking about something like Laravel or something like MEANIO, there are many parts that work together to deliver a harmonious system. Simply knowing method calls, API behavior, and some terminology will only get you so far. That&#x27;s why we are going to look at what makes up MEANIO. By learning the parts of it, we can understand how to work with it better.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;1thenodemodule&quot;&gt;1. The node module&lt;/h4&gt;
&lt;p&gt;To learn what makes a node package tick, we need to look at it&#x27;s node module. So if we turn our attention to &lt;code&gt;node_modules/meanio&lt;/code&gt; and look at the index.js we can see that all it really does is require the &lt;code&gt;lib/mean.js&lt;/code&gt; file, so let&#x27;s start there.&lt;/p&gt;
&lt;p&gt;First off, looking at mean.js we can see that it makes use of the &lt;strong&gt;lazy-dependable&lt;/strong&gt; package and the &lt;strong&gt;q&lt;/strong&gt; package. Lazy-dependable is just a dependency management container with some lazy loading features mixed it. Q is a package for making it a little nicer to work with promises. We&#x27;ll delve deeper into these in the near future.&lt;/p&gt;
&lt;p&gt;So the first thing that happens in the mean.js is this: Some dependencies are required and a meanio superclass and consturctor are created.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&#x27;use strict&#x27;;

var Container &#x3D; require(&#x27;lazy-dependable&#x27;).Container;
var Q         &#x3D; require(&#x27;q&#x27;);

function Meanio() {
  Container.call(this);

  if (this.active) return;
  Meanio.Singleton &#x3D; this;
  this.version &#x3D; require(&#x27;../package&#x27;).version;
 
 this.instanceWaitersQ &#x3D; [];
  var defer;
  while(Meanio.instanceWaiters.length){
    defer &#x3D; Q.defer();
    Meanio.instanceWaiters.shift()(this,defer);
    this.instanceWaitersQ.push(defer.promise);
  }
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The meanio constructor is created. This guy does a few things.&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;It uses the lazy-dependable container that is declared above it. This is the &lt;em&gt;&amp;quot;super-class&amp;quot;&lt;/em&gt; that meanio inherits from.&lt;/li&gt;
&lt;li&gt;It sets some version information and assigns the Meanio instance, to the property Meanio.Singleton.&lt;/li&gt;
&lt;li&gt;Next, it sets up some instanceWaiters. These are the sub modules / packages like db, engine, config ect. They are assigned as promises so when they are loaded and done with setup then they are resolved.&lt;/li&gt;
&lt;/ol&gt;
&lt;blockquote&gt;
&lt;p&gt;The job of the instance waiters is to provide a promise interface to load the dependencies of the main mean module.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;The next bit of code that we come to deals with how mean instances are constructed.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Meanio.prototype &#x3D; Object.create(Container.prototype,{constructor:{
  value: Meanio,
  enumerable: false,
  writable: false,
  configurable: false
}});
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Basically, we are assigning the prototype of Meanio to be the Container prototype. This combined with the &lt;code&gt;Container.call(this)&lt;/code&gt; from above ensures that Meanio effectively inherits all of the properties and methods of the Container package.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Setting the prototype like this lets us inherit all of the properties of the Container package ( which acts as our base class ).&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h4 id&#x3D;&quot;exploringthemeanmodulecreationabitmore&quot;&gt;Exploring the mean module creation a bit more..&lt;/h4&gt;
&lt;p&gt;For some of you who may not be familiar with JavaScript&#x27;s prototypical inheritance system, let&#x27;s break this example down a bit more ..... with another example:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Human &#x3D; function(){
	this.identify &#x3D; function(){
		console.log(&#x27;im a human&#x27;);
	}
}

function Person(){
	Human.call(this);
	this.whoAmI &#x3D; function(){
		console.log(&#x27;im a person&#x27;);
	};
}

Person.prototype &#x3D; Object.create(Human.prototype, {constructor:{
  value: Human,
  enumerable: false,
  writable: false,
  configurable: false
}});

Paul &#x3D; new Person();

Paul.identify();    //Im a human
Paul.whoAmI();     //Im a person
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;&lt;em&gt;I omitted the var keyword so this code can be pasted in to chrome dev tools to test out without dev tools complaining.&lt;/em&gt;&lt;/p&gt;
&lt;p&gt;The key here to realize is that without the &lt;code&gt;Human.call(this)&lt;/code&gt; in the Person constructor, the prototype chain linking will not work correctly and the sub-class will not inherit the methods of the parent class. The way I like to think of this is, using the call method on the super class is like calling an initialize method of the super class and instantiating an instance of the superclass and extending it into the subclass.&lt;/p&gt;
&lt;p&gt;Following these two gems of code, there is just a bit of support code where some methods are attached to the Meanio prototype at the end followed by where the rest of the magic happens.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;loadingtherestoftheframework&quot;&gt;Loading the rest of the framework&lt;/h4&gt;
&lt;pre&gt;&lt;code&gt;(require(&#x27;./core_modules/config&#x27;))(Meanio);
(require(&#x27;./menu&#x27;))(Meanio);
(require(&#x27;./core_modules/module&#x27;))(Meanio);
(require(&#x27;./core_modules/db&#x27;))(Meanio);
(require(&#x27;./core_modules/server&#x27;))(Meanio);

module.exports &#x3D; exports &#x3D; new Meanio();
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;At the end of this file the config is loaded, the menu is added, the module system is pulled in, the db config is put in place and lastly express is brought into the equation.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;&lt;strong&gt;Note:&lt;/strong&gt; that each package is pulled in as an anonymous function and the Meanio instance is given to them to be &lt;em&gt;augmented&lt;/em&gt;.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Since JavaScript objects are passed by reference these methods do not have to explicitly return and overrite the meanio instance when they are augmenting it. Simply passing it in and acting on it will globally manipulate it.&lt;/p&gt;
&lt;p&gt;I hope this has been a good exporatory article for you. As I progress deeper into the core myself I will be publishing more articles on meanio&#x27;s composition.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

