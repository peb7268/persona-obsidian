
<div class="post">
	<h1>ViewChild vs Local Variable template vars</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Per angular&#x27;s website:&lt;/p&gt;
&lt;h4 id&#x3D;&quot;parenttochildcommunication&quot;&gt;Parent to Child Communication&lt;/h4&gt;
&lt;p&gt;You can do this a number of ways but the two most common are a template variable, aka a local variable, or using ViewChild. Let&#x27;s take a look at the local variable approach first. This is what Angular&#x27;s site has to say about it:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;A &lt;strong&gt;parent component&lt;/strong&gt; &lt;em&gt;cannot&lt;/em&gt; use data binding to &lt;strong&gt;read child properties or invoke child methods&lt;/strong&gt;. You can do both by creating a template reference variable for the child element and then reference that variable within the parent template.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;They start off with an example here of a timer countdown component:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;...
&amp;lt;app-countdown-timer #timer&amp;gt;&amp;lt;/app-countdown-timer&amp;gt;
...
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The key here is the &lt;code&gt;#timer&lt;/code&gt; template var. Then within your template you can use the keyword timer to call methods and access properties. This variable acts as a reference to the child component. This approach works great, but you can only call methods, access properties, or do any other kind of wiring from within the template itself. Not the TS files. This is kind of limiting.&lt;/p&gt;
&lt;p&gt;When you have to have more direct access of your child from within the parent component, you can &#x3D;inject an instance of the child component into the parent&#x3D; via &lt;code&gt;ViewChild&lt;/code&gt;.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

