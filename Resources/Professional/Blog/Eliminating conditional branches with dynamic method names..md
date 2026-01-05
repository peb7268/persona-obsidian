
<div class="post">
	<h1>Eliminating conditional branches with dynamic method names.</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h1 id&#x3D;&quot;howtousedynamicfunctoinnamesjavascript&quot;&gt;How to use dynamic functoin names JavaScript:&lt;/h1&gt;
&lt;p&gt;In this short article we are going to examine how to write less conditional block and make use of the dynamic nature of JavaScript to write cleaner code. The concepts below just demonstrate the technique, I make no claims to best practices or security aspects of such code. So without further ado, take a look at the code snippet below and we&#x27;ll discuss it.&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-JavaScript&quot;&gt;/*
* Dynamically Delegates to one of the scroll methods.
*/
self.pan &#x3D; function($element){
	var direction  &#x3D; settings.scrollDirection.charAt(0).toUpperCase() + settings.scrollDirection.slice(1);
	var method &#x3D; &#x27;pan&#x27; + direction;
	self[method]($element);
};
self.panUp &#x3D; function($element){
	.....
}
self.panDown &#x3D; function($element){
	.....
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Ok so in many situations, developers have to make decisions on which branch of code they must invoke. In most cases this is done with a switch statement of an if block, but wouldn&#x27;t it be nice if you could just tell your code what to do instead of asking? Let me explain the context of the code above and then you&#x27;ll get it.&lt;/p&gt;
&lt;p&gt;The code above is a snippet from a parallax plugin i&#x27;ve been working on. As you scroll it keeps track of a few values. One thing it watches is the scroll direction. It knows &lt;em&gt;up&lt;/em&gt; or &lt;em&gt;down&lt;/em&gt;. When it comes time to parallax an element, I dont have to ask &lt;em&gt;if this then that&lt;/em&gt;. I just call the &lt;em&gt;pan&lt;/em&gt; method and it takes care of the rest. I&#x27;m able to leverage this technique because I can use dynamic function names. Let&#x27;s see how that works.&lt;/p&gt;
&lt;p&gt;In above snippet, pay specific attention to the &lt;em&gt;self.pan&lt;/em&gt; method, it&#x27;s where the magic happens. This method takes an element ( a jquery object ) to be precise, and then dynamically generates the method name to call based on the scroll direction. Using the array notation or subscript syntax, you can pass a string in that is the property name and then invoke it just like you would a normal method.&lt;/p&gt;
&lt;p&gt;I like this technique alot because it eliminates unnecessary conditional code and logic. It also happens to scale pretty well. If you have more questions or feedback just leave a comment.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

