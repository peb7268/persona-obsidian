
<div class="post">
	<h1>Angular 2 Property and Attribute binding explained in depth</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;This is a simple topic, but if it seems a bit foreign to you don&#x27;t let that dishearten you. I have been working with various front end frameworks and been doing DOM manipulation for years and this is a subject that gave me a bit of a mind twist. I knew what it did technically but I guess the syntax gave me some mental road blocks for some reason that kept me from really getting it fully. Don&#x27;t worry though, we&#x27;re about to wade through this swamp. Grab a Redbull, roll up your sleeves, and refill your mouse batteries and let&#x27;s go.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;htmlattributesvspropertiesinthedom&quot;&gt;HTML attributes vs Properties in the DOM&lt;/h6&gt;
&lt;p&gt;Let&#x27;s take an example case and examine it:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;input id&#x3D;&amp;quot;username&amp;quot; type&#x3D;&amp;quot;text&amp;quot; name&#x3D;&amp;quot;username&amp;quot; value&#x3D;&amp;quot;Mr. Barrick&amp;quot;&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Here we have a standard HTML element with some attributes. These attributes are just strings. One might ask, how are these values related to properties, and what does it mean when you &lt;em&gt;bind to a property&lt;/em&gt; in Angular? One step at a time, let&#x27;s tackle the first question.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;standardelementattributes&quot;&gt;Standard Element Attributes&lt;/h6&gt;
&lt;p&gt;Standard element attributes are only strings that you write when you create your markup. They usually are just attatched to provide a default or initial value. You can think of them as static values.They aren&#x27;t dynamic, they aren&#x27;t exciting, they don&#x27;t live life to the edge.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;elementproperties&quot;&gt;Element Properties&lt;/h6&gt;
&lt;p&gt;Properties on the other hand, live a fast pace exiting life, they can be the result of expressions, functions, change at runtime, ect. In other words, they can be dynamic.&lt;/p&gt;
&lt;p&gt;When we talk about a webpage and we talk about javascript we almost always end up talking about something called the DOM. This stands for the document object model. The premise of this is that a web page, aka a document, is made up of a collection of objects. That&#x27;s how javascript sees it anyways. When we look at a page&#x27;s source, we are looking at the browser&#x27;s rendered interpretation of that model. If we want to work with things from a programatic standpoint instead of just from a markup point of view, we can grab any of those elements on the page with javascript. Those elements then can be worked with like standard objects, and standard objects have properties.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;themomentoftruthwhenattributesbecomeproperties&quot;&gt;The moment of truth: When attributes become properties&lt;/h6&gt;
&lt;p&gt;When the browser reads your markup it converts the HTML to DOM nodes. Those elements become objects, DOM nodes, and the attributes become properties. There isn&#x27;t always a one to one conversion. Take for instance an attribute of &lt;em&gt;class&lt;/em&gt;. It doesn&#x27;t convert to a property of class, but instead it becomes classList.&lt;/p&gt;
&lt;p&gt;An object&#x27;s property can be almost anything. You can have a string, a function, another object, almost anything. Inversely an attribute is just a string. Angular has a declarative syntax that let&#x27;s you bind directly to an element&#x27;s properties and it calls this syntax &lt;strong&gt;property binding&lt;/strong&gt;. It looks a little something like this:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;input id&#x3D;&amp;quot;username&amp;quot; type&#x3D;&amp;quot;text&amp;quot; name&#x3D;&amp;quot;username&amp;quot; [value]&#x3D;&amp;quot;&#x27;paul1234&#x27;&amp;quot;&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The snippet above binds the string &lt;code&gt;paul1234&lt;/code&gt; to the value property of the input.&lt;/p&gt;
&lt;p&gt;That&#x27;s not the thing thats so magical though. Angular&#x27;s main purpose or property binding is to let you pass data from your component instance, directly to the template.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Angular&#x27;s main purpose or property binding is to let you pass data from your component instance, directly to the template.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;If I were to leave off the inner quotes above then the input would be looking for a property of my component instance called &lt;em&gt;paul1234&lt;/em&gt;. This is pretty cool because it means that I can have a user object in my component instance and reference that objects&#x27; values directly in my html like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;input id&#x3D;&amp;quot;username&amp;quot; type&#x3D;&amp;quot;text&amp;quot; name&#x3D;&amp;quot;username&amp;quot; [value]&#x3D;&amp;quot;user.username&amp;quot;&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;h6 id&#x3D;&quot;takingtheexampleonestepfurtherrouterlinkvsrouterlink&quot;&gt;Taking the example one step further: routerLink vs [routerLink]&lt;/h6&gt;
&lt;p&gt;Let&#x27;s look at a even more Angular-y example. Take these two cases and consider what the difference is:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;a routerLink&#x3D;&amp;quot;/home&amp;quot;&amp;gt;Home&amp;lt;/a&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;and&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;a [routerLink]&#x3D;&amp;quot;homePath&amp;quot;&amp;gt;Home&amp;lt;/a&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;So knowing what we know now, we are armed with the info we need to answer this question now right? In the first example, we are setting an attribute, &lt;code&gt;routerLink&lt;/code&gt; to a static string path &lt;code&gt;home&lt;/code&gt; in our template. In the second example, we are setting a property equal to the property homePath in our component instance.&lt;/p&gt;
&lt;p&gt;&lt;strong&gt;But wait, there&#x27;s more!&lt;/strong&gt;&lt;br&gt;
By binding to a property as opposed to a string, we can pass dynamic values to our router and we are able to take advantage of what Angular calls the &lt;em&gt;&lt;a href&#x3D;&quot;https://angular.io/docs/ts/latest/guide/router.html#!#link-parameters-array&quot;&gt;link parameters array&lt;/a&gt;&lt;/em&gt; and it looks like this:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;a [routerLink]&#x3D;&amp;quot;[&#x27;/home&#x27;, homeChildPath, {&#x27;someVar&#x27;: true}]&amp;quot;&amp;gt;Home&amp;lt;/a&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;This link would resolve to something like: &lt;code&gt;/home/myHomeChildPath;someVar&#x3D;true&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;This expressive style of writing your routes allows for some really interesting combinations and gives you a lot of flexibility and power for making your routing style fit whatever you needs case may be.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;attributebinding&quot;&gt;Attribute Binding&lt;/h5&gt;
&lt;p&gt;So let&#x27;s recap. Using the bracket syntax, &lt;code&gt;[ ]&lt;/code&gt;,  you can bind component properties directly to an elements&#x27; properties right from your template. What happens though, when you need to bind to a property of an HTML element that doesn&#x27;t exist or doesn&#x27;t translate directly from an attribute to a property? Something like this for instance:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;input [data-username]&#x3D;&amp;quot;user.name&amp;quot; type&#x3D;&amp;quot;text&amp;quot;&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;When this happens you get this lovely error:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Template parse errors:
Can&#x27;t bind to &#x27;data-username&#x27; since it isn&#x27;t a known native property
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The solution to this is use property binding syntax still, but to start it with the &lt;code&gt;attr&lt;/code&gt; prefix. This tells Angular just to bind to an attribute instead of trying to bind it to an elements property and is this is what Angular calls &lt;em&gt;attribute binding&lt;/em&gt;. That change would look like this:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;input [attr.data-username]&#x3D;&amp;quot;user.name&amp;quot; type&#x3D;&amp;quot;text&amp;quot;&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Voila! Problem solved.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;epilogue&quot;&gt;Epilogue&lt;/h5&gt;
&lt;p&gt;I hope this has been a little illuminating for some people. Using property and attribute binding you can do all kinds of nifty things. Angular doesn&#x27;t limit you to just property and attributes though. You can bind to classes, styles, and more. I encourage you to explore the &lt;a href&#x3D;&quot;https://angular.io/docs/ts/latest/guide/template-syntax.html#!#class-binding&quot;&gt;docs&lt;/a&gt; a bit and see more examples of the kind of simplistic power that Angular lays right at your feet.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;appendix&quot;&gt;Appendix:&lt;/h5&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://blog.thoughtram.io/angular/2016/10/13/two-way-data-binding-in-angular-2.html&quot;&gt;Two-Way Data Binding in Angular&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;https://angular.io/docs/ts/latest/guide/template-syntax.html#!#property-binding&quot;&gt;Angular Docs: Property Binding&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;http://stackoverflow.com/questions/6003819/properties-and-attributes-in-html&quot;&gt;Properties and Attributes in HTML&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;http://stackoverflow.com/questions/41370760/difference-between-routerlink-and-routerlink&quot;&gt;Difference between &#x27;routerLink&#x27; and [routerLink]&lt;/a&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

