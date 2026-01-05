
<div class="post">
	<h1>Mastering JavaScript starting with Object Oriented Design</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h3 id&#x3D;&quot;theprelude&quot;&gt;#####The Prelude&lt;/h3&gt;
&lt;p&gt;This article is aimed at anyone who wants to understand object oriented programming in JavaScript on a more detailed level. While it will start at a more simple level the content will become progressively more intermediate as the article continues. For you padawan level developers, don&#x27;t worry if you don&#x27;t understand something completely, leave a comment and i&#x27;ll help out. For you seasoned developers, the article will progress quickly, skip ahead. For everyone, more is on the way.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;alittlebackgroundonobjects&quot;&gt;A little background on objects&lt;/h5&gt;
&lt;p&gt;When building a system, it&#x27;s useful to model that system after real world things. If you have a Zoo, you want to have animals. You want to be able to ask the zoo for info like: How many animals there are, what kinds of animals there are, and then each animal in turn should have it&#x27;s own behavior and characteristics.&lt;/p&gt;
&lt;p&gt;In the development world, we call that behavior its&#x27; interface and the characteristics its&#x27; state. In other words, an interface is the way you interact with something, its&#x27; methods, and state is what makes each animal different.&lt;/p&gt;
&lt;p&gt;The way we model these things in the development world is with objects. For instance, you can ask the zoo for that data through its&#x27; interface like so: &lt;code&gt;zoo.getAnimalTypes()&lt;/code&gt;, or have a lion roar like so: &lt;code&gt;lion.speak()&lt;/code&gt;. This kind of natural language is only possible because we can &lt;em&gt;encapsulate&lt;/em&gt;, or hide the crazy details of these things, behind a simple and intuative way to work with them, behind objects.&lt;/p&gt;
&lt;p&gt;Many languages that work with objects are known as classical languages. They have a class, aka a blueprint, and then you make instances of that class. Think of how a builder has a blueprint and then each house is an instance of that blueprint. Another example is a cookie cutter, each cookie is an instance of that cast. Each cookie may have it&#x27;s own appearance, sprinkles, icing, ect, they may have their own state. They are all instances of the same class though.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;alittlebackgroundonjavascriptobjecttheory&quot;&gt;A little background on JavaScript object theory&lt;/h5&gt;
&lt;p&gt;A class in JavaScript is not made up of a template class and then an instance like in classical languages such as PHP or Java. A class in JavaScript is just another object.&lt;/p&gt;
&lt;p&gt;JavaScript is different. Instances come from other objects. JavaScript calls its&#x27; object style &lt;strong&gt;prototypical inheritance&lt;/strong&gt;. Instead of houses think more of the Borg in Star Trek. In fact, a better way of thinking about it is this: Android&#x27;s are based on a prototype: the iPhone. ;)&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;A better way of thinking about it is this: Android&#x27;s are based on a prototype: the iPhone. ;)&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;I know all my nerdy android fan&#x27;s out there love that last comment. Simmer down now guys, i&#x27;m a Samsung guy myself, but let&#x27;s face the facts. Before the iPhone, we had flip phones and qwerty keyboards. Post iPhone, we have touch screen phones with home buttons and apps. You could say those android devices were based off of a &lt;em&gt;prototype&lt;/em&gt;. Another object, not a class, not a blueprint of that object. This post assumes you have some basic understanding of object so we wont go into too much more detail on this topic. We wont cover the nuances of inheritance, abstract methods and such. There just isn&#x27;t enough time for that and that would be better in another post if you guys want. Just lmk.&lt;/p&gt;
&lt;p&gt;But enough of the salad, let&#x27;s skip to the meat. For the sake of discussion, let&#x27;s assume this post will revolve around a fictional banking application.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;thewaystomakeobjectsinjavascriptthemanyways&quot;&gt;The Ways to make objects in JavaScript ... the many ways.&lt;/h5&gt;
&lt;p&gt;JavaScript loves to give developers freedom. For that reason, code can look like something from the wild west, an eloquent work of art. Further more, there is a broad scope of knowledge to learn about if you want to be a JS developer in todays modern times. You have compilers, transpilers, superset&#x27;s of the language, hoisting, modules, server side JS, and more to master. To complicate matters a bit more, there isn&#x27;t just one way of making objects in JS. There are several, and then variations on all of those, but to be a master JS developer, you have to start with learning good object oriented development ( &lt;em&gt;OOP&lt;/em&gt; )practices in JavaScript.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Mastering JavaScript all starts with OOP.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Don&#x27;t get me wront, you need to learn about the prototype chain, how JS uses scope, and a host of other things, but fundamentally, everything in JS comes back to objects and understanding how to use them efficiently in JS.&lt;/p&gt;
&lt;p&gt;So here we go, in a nutshell, there are three main ways of making objects in JS and they are as follows:  &lt;em&gt;object literals&lt;/em&gt;, &lt;em&gt;constructor functions&lt;/em&gt;, or &lt;em&gt;Object.create&lt;/em&gt;.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;objectliterals&quot;&gt;Object Literals&lt;/h6&gt;
&lt;p&gt;First up, the simplest of the group. If you need quick, easy objects to pass around for configuration, data modeling, things like that, then an object literal is all you need. The drawback to this simplicity is that you don&#x27;t get the nifty pseudo-classical inheritance features of JavaScript.&lt;/p&gt;
&lt;p&gt;Object literals consist of nothing more than curly braces with key value properties.&lt;/p&gt;
&lt;p&gt;Those may be useful for modeling things like a transaction:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;//Transaction
var transaction &#x3D; {
  &amp;quot;id&amp;quot;: 1023542,
  &amp;quot;customer_id&amp;quot;: &amp;quot;username&amp;quot;
  &amp;quot;amount&amp;quot;: 124.63,
  &amp;quot;getAccountBalance&amp;quot;: function(){
     return amount;
  }
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;So now we have an object. Nothing great here though. It&#x27;s pretty much just a map. There isn&#x27;t any data encapsulation, polymorphism, ect.. It&#x27;s not really a true classical object instance.&lt;/p&gt;
&lt;p&gt;So we&#x27;re off to a great start. We can now make that hypothetical Zoo we were talking about before. So next up, constructor functions.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;constructorfunctionsonestepup&quot;&gt;Constructor Functions: One step up&lt;/h6&gt;
&lt;p&gt;A constructor function allows you to more closely model a class. You can pass in parameters when instantiating an instance and have &lt;em&gt;instance properties&lt;/em&gt; ( properties that differ for each instance ) as well as &lt;em&gt;static properties&lt;/em&gt; ( properties that are the same for all members of an instance ).&lt;/p&gt;
&lt;p&gt;One concept that is fundamental, when you are writing the body of the object any time you want to refer to the instance that you are currently working with, the instance that is going to be created, you use the keyword &lt;em&gt;this&lt;/em&gt;. With that being said, let&#x27;s dive into an example.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;//Constructor aka The class
function Account(user, starting_balance){
    this.date_opened &#x3D; new Date();
    this.user &#x3D; user;
    this.starting_balance &#x3D; starting_balance;
}

//Instance of the class
var myAccount &#x3D; new Account(paul, 123.54);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;So what&#x27;s going on here?&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Account&lt;/em&gt; is that blueprint we talked about before. Whenever you make a new instance of that Account blueprint by invoking the &lt;em&gt;new keyword&lt;/em&gt; with a function, you are making an a few things happen. First, a new instance of that object is created and automatically returned. Next, as we said above, the context of &lt;strong&gt;this&lt;/strong&gt; becomes the function you are in instead of the &lt;strong&gt;window&lt;/strong&gt;, the global object. Anything that is attached to &lt;em&gt;this&lt;/em&gt; becomes a property of that object instance that is returned.&lt;/p&gt;
&lt;p&gt;Be careful though, this method of object creation doesn&#x27;t ensure that the object was created properly with the new keyword. Anytime someone leaves off the new keyword, all of the instance properties in that object get bound to the global object, the window.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Make sure to use the &lt;em&gt;new&lt;/em&gt; keyword when creating an instance of an object or all your properties will be added to the global scope.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;But hey, why stop there? Since we&#x27;re always improving, let&#x27;s take this a step further.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;keepitrealyomakethemusethenewkeyword&quot;&gt;Keep it real yo: Make them use the new keyword&lt;/h6&gt;
&lt;p&gt;When using constructors in plain JS, it&#x27;s advisable to enforce usage of the new keyword so you don&#x27;t have unintended scope collision. How do we do that you ask? Glad you asked, here is how:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;function Account(user, starting_balance){
	var that;
    that &#x3D; (! (this instanceof Account)) ? new Account() : this;

    that.date_opened &#x3D; new Date();
    that.user &#x3D; user;
    that.starting_balance &#x3D; starting_balance;

    return that;
}

var account &#x3D; Account(&#x27;Paul&#x27;, 124.58);  //Now it magically works without corrupting the global scope.
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;and the behavior can be seen here:&lt;/p&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;http://imgur.com/fK1Gq6t&quot;&gt;&lt;img src&#x3D;&quot;http://i.imgur.com/fK1Gq6t.png&quot; title&#x3D;&quot;source: imgur.com&quot; /&gt;&lt;/a&gt;&lt;/p&gt;
&lt;p&gt;So what&#x27;s the advantage to using constructor functions over object literal syntax?&lt;/p&gt;
&lt;p&gt;Well there are a few benefits:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;You have better memory management.&lt;/li&gt;
&lt;li&gt;You can attach things to the prototype instead of just to the instance.&lt;/li&gt;
&lt;li&gt;You can encapsulate things that you don&#x27;t want visible to the outside wolrd.&lt;/li&gt;
&lt;li&gt;You can promote code reuse and better system design by using inheritance.&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;A word on the memory management, when you create object from object literal syntax any methods or properties you have, exist on each object. That means that even if you have 20 account objects, each object will have its&#x27; own copy of everything. By using constructor functions and prototypes you only have 1 copy of things that each instance inherits.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;alittlemoreobjecttheory&quot;&gt;A little more object theory&lt;/h6&gt;
&lt;p&gt;So our &lt;code&gt;account&lt;/code&gt; object has instance properties. These properties can be accessed by using the object operator &lt;code&gt;.&lt;/code&gt; like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;account.name &#x3D; &#x27;Paul&#x27;;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;These are what&#x27;s known as &lt;em&gt;publicly accessible properties&lt;/em&gt;. In classical languages, you have three main types of properties. public, private, and protected. The best practice rule for programming, is only expose stuff that is needed and only when it is needed. For example, in a banking application, you might only want to expose the client name and balance for security, not the account number itself. So the question becomes, how do we hide data in an object that we don&#x27;t want accessible to the outside world?&lt;/p&gt;
&lt;p&gt;Say hello to my little friend: &lt;strong&gt;The Module Revealing Pattern&lt;/strong&gt;&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;var AccountFactory &#x3D; function(balance, user){
    var _account   &#x3D; {};
    
    var _balance   &#x3D; balance;
    var _user      &#x3D; user;
    
    _account.getBalance &#x3D; function(){
       return &amp;quot;The balance is: &amp;quot; + _balance;
    }

    return _account;
};
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;And you can see the results here:&lt;/p&gt;
&lt;img src&#x3D;&quot;http://i.imgur.com/3iTdRik.png&quot; title&#x3D;&quot;source: imgur.com&quot; /&gt;
&lt;p&gt;You get the benefits of private data and methods without the need of the new keyword. The only difference is this approach leaves you without any inheritance and again, individual copies of each data structure on each object.&lt;/p&gt;
&lt;p&gt;Also, you really don&#x27;t see the full value of this pattern here. Factories are great when you need to produce different types of objects with similar characteristics. For example, you have a Samsung class that produces phone objects. Maybe you want to get the dependencies from phone A here and the dependencies from phone B here, and the battery for both from Apple&#x27;s suppliers haha. Seriously though, you can use conditionals to maybe run some bootstrapping code for one type of object but perhaps hit a different API endpoint for another and have it all behind the same factory facade. That&#x27;s really where factories come in at.&lt;/p&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;http://slides.com/i-linkuo/the-revealing-module-is-an-anti-pattern#/&quot;&gt;A little more reading on the different variations of the MRP&lt;/a&gt;&lt;/p&gt;
&lt;h5 id&#x3D;&quot;adeeperdiveintoprototypes&quot;&gt;A deeper dive into prototypes&lt;/h5&gt;
&lt;p&gt;So you have seen constructor functions, and you have seen an example of a factory, and the module revealing pattern, but imo you have yet to see the true power of JavaScript objects. That comes down to one word: Prototypes. Prototypes are JavaScript&#x27;s way of implementing a key feature of OOP languages called &lt;strong&gt;inheritance&lt;/strong&gt;.&lt;/p&gt;
&lt;p&gt;Take a &lt;code&gt;Animal&lt;/code&gt; object for instance.  It could inherit from a mammal or reptile object. They would inherit characteristics from their &lt;em&gt;parent&lt;/em&gt; object or aka &lt;em&gt;superclass&lt;/em&gt;. An example of those may be blood type whereas a lion may inherit a speak method which allow&#x27;s it to roar while a tabby cat animal may speak by purring.&lt;/p&gt;
&lt;p&gt;To understand prototypes, inheritance, and all that good stuff, it&#x27;s important to know one thing: In JavaScript, almost everything is an object. A prototype is nothing more than an object that the current object was created from. When I say object, its important to remember a function is an object in JavaScript. Check out this blank object and the methods it has:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;In JavaScript, almost everything is an object.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;img src&#x3D;&quot;http://i.imgur.com/TfA4ezU.png&quot; title&#x3D;&quot;source: imgur.com&quot; /&gt;
&lt;p&gt;Now take a look at this blank function and the methods &lt;em&gt;it&lt;/em&gt; has:&lt;/p&gt;
&lt;img src&#x3D;&quot;http://i.imgur.com/iK1mQZB.png&quot; title&#x3D;&quot;source: imgur.com&quot; /&gt;
&lt;p&gt;As you can see, these guys share common methods and properties. Where did they come from? You guessed it, inheritance from the parent object. Every object in JavaScript inherits from one ancestor object called ... &lt;code&gt;Object&lt;/code&gt;. Very creative I know, makes sense though.&lt;/p&gt;
&lt;p&gt;So let&#x27;s try this out using our fictional banking scenario. We&#x27;ll implement some inheritance and then i&#x27;ll can explain it.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;var Person   &#x3D; function(first_name, last_name, street_address){
	this.first_name &#x3D; first_name;
	this.last_name  &#x3D; last_name;
	this.address    &#x3D; street_address;
};

Person.prototype.getFullName &#x3D; function(){
	return this.first_name + &#x27; &#x27; + this.last_name;
}

var Customer &#x3D; function(first_name, last_name, street_address, initial_balance){
	Person.call(this, first_name, last_name, street_address);

	var _balance &#x3D; initial_balance;

	return {
		getBalance: function(){
			return _balance;
		}
	}
};


&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain&quot;&gt;MDN On inheritance&lt;/a&gt;&lt;/p&gt;
&lt;h5 id&#x3D;&quot;objectcreate&quot;&gt;Object.create&lt;/h5&gt;
&lt;p&gt;So you have seen object literal syntax, and you have seen the constructor function along with a variation. Let&#x27;s take a stab at a different approach now, &lt;code&gt;Object.create()&lt;/code&gt;.&lt;/p&gt;
&lt;p&gt;This method of object creation gives you a much more fine grained approach to creating your objects without the need for so much manual maneuvering to achieve inheritance and more advanced things. The downside is it is a little less supported with IE just picking up support in version 10. So if you are worried about legacy support this may not be the way to go, but if you are fine with supporting 90% of the browsers out there and the modern web, then this approach deserves a deeper look.&lt;/p&gt;
&lt;p&gt;Object.create has the following signature:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Object.create(proto, [properties object]);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Where proto should either be a null object or the prototype to inherit from and properties object is a set of properties that defines how data within the object should behave.&lt;/p&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create&quot;&gt;More from MDN&lt;/a&gt;&lt;/p&gt;
&lt;h5 id&#x3D;&quot;es6objects&quot;&gt;ES6 Objects&lt;/h5&gt;
&lt;h5 id&#x3D;&quot;typescript&quot;&gt;Typescript&lt;/h5&gt;
&lt;/div&gt;
	</div>
</div>

