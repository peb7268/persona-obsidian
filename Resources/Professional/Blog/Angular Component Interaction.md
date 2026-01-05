
<div class="post">
	<h1>Angular Component Interaction</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;The goal of this post is to break down and summarize common scenarios where two or more components need to share information.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Parent to child communication via Input Binding -&lt;/em&gt; An @Input decarator is attached to a child class property. The Parent component uses property binding syntex (&lt;code&gt;[]&lt;/code&gt;) to bind one its properties to the next available property on the child component decorated with the @Input Decorator.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Intercepting input property changes via a setter -&lt;/em&gt; Use an input property setter to intercept and act upon a value from the parent. The setter can modify the value and execute any other related logic. The getter returns the value.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Intercept input property changes with ngOnChanges() -&lt;/em&gt; You may prefer this approach to the property setter when watching multiple, interacting input properties. The ngOnChanges lifecycle hook responds when Angular (re)sets data-bound input properties. The method receives a SimpleChanges object of current and previous property values.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Parent listens for child event -&lt;/em&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

